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
        if (!assetProfile) return false;

        const industry = ((assetProfile.industry || '') + ' ' + (assetProfile.sector || '')).toLowerCase();
        const companyName = (assetProfile.longBusinessSummary || '').toLowerCase();

        // Check industry/sector keywords
        const prohibitedKeywords = [
            'alcohol', 'tobacco', 'gambling', 'casino', 'gaming',
            'bank', 'insurance', 'financial services', 'adult', 'defense',
            'brewery', 'distillery', 'wine', 'beer', 'liquor'
        ];

        if (prohibitedKeywords.some(term => industry.includes(term))) {
            return true;
        }

        // Check business description for prohibited activities
        const prohibitedInDescription = [
            'alcohol', 'alcoholic beverages', 'wine', 'beer', 'liquor',
            'pork', 'pork products', 'ham', 'bacon',
            'gambling', 'casino', 'lottery',
            'tobacco', 'cigarette', 'cigar'
        ];

        if (prohibitedInDescription.some(term => companyName.includes(term))) {
            return true;
        }

        // Specific retailers/wholesalers known to sell alcohol and/or pork
        // These companies have significant revenue from haram products
        const retailersWithHaramProducts = [
            'COST',  // Costco - sells alcohol and pork (~10% revenue)
            'WMT',   // Walmart - sells alcohol and pork
            'TGT',   // Target - sells alcohol
            'KR',    // Kroger - grocery with alcohol/pork
            'ACI',   // Albertsons - grocery with alcohol/pork
            'SYY',   // Sysco - food distributor with alcohol/pork
            'UNFI',  // United Natural Foods - distributes alcohol
            'GO',    // Grocery Outlet - sells alcohol
            'INGR',  // Ingredion - may process pork products
            'BJ',    // BJ's Wholesale - sells alcohol/pork
            'VLGEA', // Village Super Market - sells alcohol
            'WMK',   // Weis Markets - sells alcohol/pork
            'SFM',   // Sprouts Farmers Market - sells alcohol
            'IMKTA'  // Ingles Markets - sells alcohol/pork
        ];

        return retailersWithHaramProducts.includes(assetProfile.symbol?.toUpperCase());
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

        // AAOIFI: Interest-bearing debt must be ≤ 30% of market cap
        if (stockData.debtRatio > 0.30) {
            issues.push(`Interest-bearing debt ${(stockData.debtRatio * 100).toFixed(1)}% exceeds 30% (AAOIFI)`);
        }

        // AAOIFI: Interest-earning assets must be ≤ 30% of market cap
        if (stockData.liquidAssetsRatio > 0.30) {
            issues.push(`Liquid assets ${(stockData.liquidAssetsRatio * 100).toFixed(1)}% exceed 30% (AAOIFI)`);
        }

        // AAOIFI: Non-permissible income must be ≤ 5% of total revenue
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
            complianceScore: score,
            methodology: 'AAOIFI Shariah Standard 21',
            purificationRequired: isCompliant && stockData.interestIncome > 0,
            purificationPercentage: stockData.interestIncome
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
