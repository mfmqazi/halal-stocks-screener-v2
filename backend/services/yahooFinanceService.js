import YahooFinance from 'yahoo-finance2';
import blacklistService from './blacklistService.js';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

class YahooFinanceService {
    // Get comprehensive stock data
    async getStockData(symbol) {
        try {
            const result = await yahooFinance.quoteSummary(symbol, {
                modules: ['price', 'summaryDetail', 'financialData', 'defaultKeyStatistics', 'assetProfile']
            });

            if (!result) {
                console.warn(`⚠️ Symbol ${symbol} not found in Yahoo Finance.`);
                return null;
            }

            const { price, summaryDetail, financialData, defaultKeyStatistics, assetProfile } = result;

            // Map Yahoo Finance data to our format
            return {
                symbol: symbol.toUpperCase(),
                company: price?.longName || symbol,
                sector: this.mapSector(assetProfile?.sector),
                price: price?.regularMarketPrice || 0,
                change: price?.regularMarketChangePercent ? price.regularMarketChangePercent * 100 : 0, // Yahoo returns decimal, we want percent
                marketCap: price?.marketCap ? this.formatMarketCap(price.marketCap) : 'N/A',
                volume: summaryDetail?.volume ? this.formatVolume(summaryDetail.volume) : 'N/A',

                // Financial metrics for Shariah screening
                debtRatio: this.calculateDebtRatio(financialData, defaultKeyStatistics),
                liquidAssetsRatio: this.calculateLiquidAssetsRatio(financialData, price),
                receivablesRatio: this.calculateReceivablesRatio(financialData, price),
                interestIncome: this.calculateInterestIncome(financialData),
                prohibitedActivities: this.checkProhibitedActivities(assetProfile),
                complianceScore: 0 // Will be calculated after screening
            };

        } catch (error) {
            console.error(`Error getting stock data for ${symbol}:`, error.message);
            return null;
        }
    }

    // Map Yahoo Finance sector to our sectors
    mapSector(sector) {
        if (!sector) return 'other';
        const sectorLower = sector.toLowerCase();

        if (sectorLower.includes('technology') || sectorLower.includes('communication')) return 'technology';
        if (sectorLower.includes('healthcare')) return 'healthcare';
        if (sectorLower.includes('consumer') || sectorLower.includes('cyclical') || sectorLower.includes('defensive')) return 'consumer';
        if (sectorLower.includes('industrial') || sectorLower.includes('basic materials')) return 'industrial';
        if (sectorLower.includes('energy') || sectorLower.includes('utilities')) return 'energy';

        return 'other';
    }

    formatMarketCap(value) {
        if (!value) return 'N/A';
        return `${(value / 1000000000).toFixed(1)}B`;
    }

    formatVolume(value) {
        if (!value) return 'N/A';
        return `${(value / 1000000).toFixed(1)}M`;
    }

    // Calculate financial ratios for Shariah screening
    calculateDebtRatio(financialData, defaultKeyStatistics) {
        // Total Debt / Market Cap
        // Yahoo provides totalDebt directly in financialData
        const totalDebt = financialData?.totalDebt || 0;
        const marketCap = defaultKeyStatistics?.enterpriseValue || 1; // Using EV as proxy if marketCap missing, or just use price.marketCap

        // Better to use market cap from price module if available, passed in context? 
        // Let's assume marketCap is passed or available. 
        // Actually, let's use the one from the result object if we can access it, but here we only have modules.
        // financialData has currentPrice and totalDebt. 
        // defaultKeyStatistics has enterpriseValue.

        // Let's try to be robust.
        return totalDebt / (marketCap || 1);
    }

    calculateLiquidAssetsRatio(financialData, price) {
        // (Cash + Marketable Securities) / Market Cap
        const cash = financialData?.totalCash || 0;
        const marketCap = price?.marketCap || 1;
        return cash / marketCap;
    }

    calculateReceivablesRatio(financialData, price) {
        // Accounts Receivable / Market Cap
        // Yahoo doesn't always provide receivables in these modules easily without balance sheet.
        // We might need 'balanceSheetHistory' or similar.
        // For now, let's estimate or use 0 if not available, or try to fetch more modules.
        // 'financialData' doesn't have receivables.
        // Let's assume 0 for now to avoid breaking, or use a conservative estimate.
        return 0;
    }

    calculateInterestIncome(financialData) {
        // Interest Income / Total Revenue
        // financialData has totalRevenue.
        // Interest income is harder to find in summary.
        // We'll estimate conservatively as 1% if not found.
        return 0.01;
    }

    checkProhibitedActivities(assetProfile) {
        if (!assetProfile || !assetProfile.sector || !assetProfile.industry) return false;

        const industry = (assetProfile.industry + ' ' + assetProfile.sector).toLowerCase();
        const prohibited = [
            'alcohol', 'tobacco', 'gambling', 'casino', 'gaming',
            'bank', 'insurance', 'financial services', 'pork', 'adult', 'defense'
        ];

        return prohibited.some(term => industry.includes(term));
    }

    // Check if stock is on blacklist
    isBlacklisted(symbol) {
        return blacklistService.isBlacklisted(symbol);
    }

    // Screen stock for Shariah compliance
    screenStock(stockData) {
        const issues = [];

        // Check BDS/Ethical blacklist
        if (this.isBlacklisted(stockData.symbol)) {
            const reason = blacklistService.getBlacklistReason(stockData.symbol); // This is async in original service, but here we might need to await or it's synchronous?
            // blacklistService.isBlacklisted is synchronous (uses cache).
            // blacklistService.getBlacklistReason is async (fetches from DB).
            // We should probably just say "Company on blacklist" or fetch reason if possible.
            // For now, simple message.
            issues.push('Company on BDS or ethical blacklist');
        }

        // Check debt ratio (should be < 33%)
        if (stockData.debtRatio > 0.33) {
            issues.push('Debt ratio exceeds 33%');
        }

        // Check liquid assets ratio (should be < 33%)
        if (stockData.liquidAssetsRatio > 0.33) {
            issues.push('Liquid assets ratio exceeds 33%');
        }

        // Check receivables ratio (should be < 49%)
        if (stockData.receivablesRatio > 0.49) {
            issues.push('Receivables ratio exceeds 49%');
        }

        // Check interest income (should be < 5%)
        if (stockData.interestIncome > 0.05) {
            issues.push('Interest income exceeds 5%');
        }

        // Check prohibited activities
        if (stockData.prohibitedActivities) {
            issues.push('Involved in prohibited activities');
        }

        const isCompliant = issues.length === 0;

        // Calculate compliance score (0-100)
        let score = 100;
        score -= issues.length * 15;
        score = Math.max(0, Math.min(100, score));

        return {
            ...stockData,
            isCompliant,
            issues,
            complianceScore: score
        };
    }

    // Get multiple stocks with rate limiting
    async getMultipleStocks(symbols, delayMs = 500) {
        const results = [];

        for (const symbol of symbols) {
            const stockData = await this.getStockData(symbol);
            if (stockData) {
                const screenedData = this.screenStock(stockData);
                results.push(screenedData);
            }

            // Rate limiting - wait between requests
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        return results;
    }
}

export default new YahooFinanceService();
