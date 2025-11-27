import express from 'express';
import Stock from '../models/Stock.js';
import mongoose from 'mongoose';

const router = express.Router();

// GET /api/stats - Get screening statistics
router.get('/', async (req, res) => {
    try {
        // Check if MongoDB is connected
        if (mongoose.connection.readyState !== 1) {
            return res.json({
                stocksAnalyzed: 0,
                shariahCompliant: 0,
                ethicallyScreened: 0,
                message: 'Database not connected - stats unavailable'
            });
        }

        // Get total stocks analyzed (all stocks in database)
        const stocksAnalyzed = await Stock.countDocuments({});

        // Get Shariah compliant stocks
        const shariahCompliant = await Stock.countDocuments({ isCompliant: true });

        // Get ethically screened stocks (not on BDS/ethical blacklist)
        // This includes both compliant and non-compliant, but excludes blacklisted
        const ethicallyScreened = await Stock.countDocuments({
            issues: { $not: { $regex: /blacklist/i } }
        });

        // Get additional stats
        const nonCompliant = await Stock.countDocuments({ isCompliant: false });

        // Get stocks by sector
        const bySector = await Stock.aggregate([
            { $group: { _id: '$sector', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Get top compliant stocks by score
        const topCompliant = await Stock.find({ isCompliant: true })
            .sort({ complianceScore: -1 })
            .limit(10)
            .select('symbol company complianceScore sector');

        // Get recently analyzed stocks
        const recentlyAnalyzed = await Stock.find({})
            .sort({ lastUpdated: -1 })
            .limit(10)
            .select('symbol company isCompliant lastUpdated');

        res.json({
            stocksAnalyzed,
            shariahCompliant,
            ethicallyScreened,
            nonCompliant,
            complianceRate: stocksAnalyzed > 0 ? ((shariahCompliant / stocksAnalyzed) * 100).toFixed(1) : 0,
            bySector,
            topCompliant,
            recentlyAnalyzed,
            lastUpdated: new Date()
        });

    } catch (error) {
        console.error('Error fetching stats:', error.message);
        res.status(500).json({
            error: 'Failed to fetch statistics',
            message: error.message
        });
    }
});

export default router;
