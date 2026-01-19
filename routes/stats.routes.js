// routes/stats.routes.js - Dashboard Statistics Routes
const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const { authenticate } = require('../middleware/auth');
const { buildRoleFilter } = require('../middleware/rbac');

/**
 * GET /api/stats
 * Get dashboard statistics with RBAC filtering
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const { hours = 24 } = req.query;
        const timeAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
        
        console.log(`📊 Calculating stats for ${req.user.username} (${req.user.role}) - last ${hours}h`);
        
        // Build RBAC filter
        const roleFilter = buildRoleFilter(req.user, { timestamp: { $gte: timeAgo } });
        
        // Execute aggregation pipeline
        const stats = await Alert.aggregate([
            { $match: roleFilter },
            {
                $facet: {
                    overview: [
                        {
                            $group: {
                                _id: null,
                                recent: { $sum: 1 },
                                criticalCount: {
                                    $sum: { $cond: [{ $eq: ['$severity', 'Critical'] }, 1, 0] }
                                },
                                incidentCount: {
                                    $sum: { $cond: [{ $eq: ['$engine', 'CORRELATION BRAIN'] }, 1, 0] }
                                }
                            }
                        }
                    ],
                    severity: [
                        { $group: { _id: '$severity', count: { $sum: 1 } } },
                        { $sort: { count: -1 } }
                    ],
                    engines: [
                        { $group: { _id: '$engine', count: { $sum: 1 } } },
                        { $sort: { count: -1 } }
                    ],
                    hourlyTrend: [
                        {
                            $group: {
                                _id: {
                                    $dateToString: {
                                        format: '%Y-%m-%d %H:00',
                                        date: '$timestamp'
                                    }
                                },
                                count: { $sum: 1 },
                                critical: {
                                    $sum: { $cond: [{ $eq: ['$severity', 'Critical'] }, 1, 0] }
                                },
                                high: {
                                    $sum: { $cond: [{ $eq: ['$severity', 'High'] }, 1, 0] }
                                }
                            }
                        },
                        { $sort: { _id: 1 } }
                    ]
                }
            }
        ]);
        
        const result = stats[0];
        const overview = result.overview[0] || { 
            recent: 0, 
            criticalCount: 0, 
            incidentCount: 0 
        };
        
        // Get total count (all time)
        const totalFilter = buildRoleFilter(req.user);
        const total = await Alert.countDocuments(totalFilter);
        overview.total = total;
        
        res.json({
            overview,
            severity: result.severity,
            engines: result.engines,
            hourlyTrend: result.hourlyTrend
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Server error calculating statistics' });
    }
});

/**
 * GET /api/stats/detailed
 * Get detailed statistics (Senior/Admin only)
 */
router.get('/detailed', authenticate, async (req, res) => {
    try {
        // Employees don't get detailed stats
        if (req.user.role === 'employee') {
            return res.status(403).json({ 
                error: 'Detailed statistics require senior analyst or admin access' 
            });
        }
        
        const { hours = 24 } = req.query;
        const timeAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
        
        // Top Targeted Entities
        const topEntities = await Alert.aggregate([
            { $match: { timestamp: { $gte: timeAgo } } },
            {
                $group: {
                    _id: {
                        $ifNull: [
                            "$details.target_entity",
                            { $ifNull: [
                                "$details.ip_address",
                                { $ifNull: ["$details.source_ip", "$details.user_id"] }
                            ]}
                        ]
                    },
                    count: { $sum: 1 },
                    maxSeverity: { $max: "$severity" },
                    engines: { $addToSet: "$engine" }
                }
            },
            { $match: { _id: { $ne: null } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        
        // Engine Activity
        const engineActivity = await Alert.aggregate([
            { $match: { timestamp: { $gte: timeAgo } } },
            {
                $group: {
                    _id: "$engine",
                    totalAlerts: { $sum: 1 },
                    critical: { $sum: { $cond: [{ $eq: ["$severity", "Critical"] }, 1, 0] } },
                    high: { $sum: { $cond: [{ $eq: ["$severity", "High"] }, 1, 0] } },
                    avgResponseTime: { $avg: { $subtract: [new Date(), "$timestamp"] } }
                }
            },
            { $sort: { totalAlerts: -1 } }
        ]);
        
        // Recent Critical Alerts
        const recentCritical = await Alert.find({
            severity: 'Critical',
            timestamp: { $gte: timeAgo }
        })
        .sort({ timestamp: -1 })
        .limit(5)
        .select('engine alertType details timestamp status');
        
        // Correlation Incidents
        const correlationIncidents = await Alert.find({
            engine: 'CORRELATION BRAIN',
            timestamp: { $gte: timeAgo }
        })
        .sort({ timestamp: -1 })
        .limit(10);
        
        res.json({
            topEntities,
            engineActivity,
            recentCritical,
            correlationIncidents
        });
    } catch (error) {
        console.error('Detailed stats error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * GET /api/stats/timeline
 * Get alert timeline for a specific time range
 */
router.get('/timeline', authenticate, async (req, res) => {
    try {
        const { startDate, endDate, granularity = 'hour' } = req.query;
        
        const start = new Date(startDate || Date.now() - 24 * 60 * 60 * 1000);
        const end = new Date(endDate || Date.now());
        
        // Format based on granularity
        let dateFormat;
        switch (granularity) {
            case 'minute':
                dateFormat = '%Y-%m-%d %H:%M';
                break;
            case 'hour':
                dateFormat = '%Y-%m-%d %H:00';
                break;
            case 'day':
                dateFormat = '%Y-%m-%d';
                break;
            default:
                dateFormat = '%Y-%m-%d %H:00';
        }
        
        const roleFilter = buildRoleFilter(req.user, {
            timestamp: { $gte: start, $lte: end }
        });
        
        const timeline = await Alert.aggregate([
            { $match: roleFilter },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: dateFormat,
                            date: '$timestamp'
                        }
                    },
                    count: { $sum: 1 },
                    critical: { $sum: { $cond: [{ $eq: ['$severity', 'Critical'] }, 1, 0] } },
                    high: { $sum: { $cond: [{ $eq: ['$severity', 'High'] }, 1, 0] } },
                    medium: { $sum: { $cond: [{ $eq: ['$severity', 'Medium'] }, 1, 0] } },
                    low: { $sum: { $cond: [{ $eq: ['$severity', 'Low'] }, 1, 0] } }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        res.json({ timeline });
    } catch (error) {
        console.error('Timeline error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
