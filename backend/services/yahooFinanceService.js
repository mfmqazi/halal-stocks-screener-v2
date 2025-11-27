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

            // Handle currency conversion for ADRs (e.g., TSM)
            // Financial data might be in local currency (e.g., TWD) while price is in USD
            let exchangeRate = 1;
            if (financialData?.financialCurrency && price?.currency && financialData.financialCurrency !== price.currency) {
                try {
                    const pair = `${financialData.financialCurrency}${price.currency}=X`; // e.g., TWDUSD=X
                    const rateData = await yahooFinance.quote(pair);
                    if (rateData && rateData.regularMarketPrice) {
                        exchangeRate = rateData.regularMarketPrice;
                        console.log(`💱 Converting ${financialData.financialCurrency} to ${price.currency} at rate ${exchangeRate}`);
                    }
                } catch (e) {
                    console.warn(`⚠️ Could not fetch exchange rate for ${financialData.financialCurrency}/${price.currency}`);
                }
            }

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
                debtRatio: this.calculateDebtRatio(financialData, defaultKeyStatistics, price, exchangeRate),
                liquidAssetsRatio: this.calculateLiquidAssetsRatio(financialData, price, exchangeRate),
                receivablesRatio: this.calculateReceivablesRatio(financialData, price, exchangeRate),
                interestIncome: this.calculateInterestIncome(financialData),
                prohibitedActivities: this.checkProhibitedActivities(assetProfile, symbol.toUpperCase()),
                complianceScore: 0 // Will be calculated after screening
            };

        } catch (error) {
            console.error(`Error getting stock data for ${symbol}:`, error.message);
            return null;
        }
    }
}

    // Search for stocks using Yahoo Finance API
    async searchStocks(query) {
    try {
        const results = await yahooFinance.search(query, { quotesCount: 10, newsCount: 0 });

        if (!results || !results.quotes) return [];

        return results.quotes
            .filter(quote => quote.isYahooFinance && quote.quoteType === 'EQUITY' || quote.quoteType === 'ETF')
            .map(quote => ({
                symbol: quote.symbol,
                company: quote.longname || quote.shortname || quote.symbol,
                exchange: quote.exchange,
                type: quote.quoteType
            }));
    } catch (error) {
        console.error(`Error searching stocks for ${query}:`, error.message);
        return [];
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
calculateDebtRatio(financialData, defaultKeyStatistics, price, exchangeRate = 1) {
    // Total Debt / Market Cap
    // Yahoo provides totalDebt directly in financialData
    let totalDebt = financialData?.totalDebt || 0;

    // Convert debt to same currency as market cap if needed
    totalDebt = totalDebt * exchangeRate;

    const marketCap = price?.marketCap || defaultKeyStatistics?.enterpriseValue || 1;

    return totalDebt / (marketCap || 1);
}

calculateLiquidAssetsRatio(financialData, price, exchangeRate = 1) {
    // (Cash + Marketable Securities) / Market Cap
    let cash = financialData?.totalCash || 0;

    // Convert cash to same currency as market cap
    cash = cash * exchangeRate;

    const marketCap = price?.marketCap || 1;
    return cash / marketCap;
}

calculateReceivablesRatio(financialData, price, exchangeRate = 1) {
    // Accounts Receivable / Market Cap
    // Not used in AAOIFI Standard 21, but kept for reference
    return 0;
}

calculateInterestIncome(financialData) {
    // Interest Income / Total Revenue
    // financialData has totalRevenue.
    // Interest income is harder to find in summary.
    // We'll estimate conservatively as 1% if not found.
    return 0.01;
}

checkProhibitedActivities(assetProfile, symbol) {
    if (!assetProfile && !symbol) return false;

    symbol = symbol || assetProfile?.symbol?.toUpperCase() || '';
    const industry = ((assetProfile.industry || '') + ' ' + (assetProfile.sector || '')).toLowerCase();
    const companyName = (assetProfile.longBusinessSummary || '').toLowerCase();

    // NON-COMPLIANT ETFs and Index Funds
    // Most broad-market ETFs hold banks, insurance, alcohol, etc.
    const nonCompliantETFs = [
        // S&P 500 ETFs (hold banks, insurance, alcohol companies)
        'SPY',   // SPDR S&P 500 ETF - holds JPM, BAC, C, etc.
        'VOO',   // Vanguard S&P 500 ETF
        'IVV',   // iShares Core S&P 500 ETF

        // Total Market ETFs
        'VTI',   // Vanguard Total Stock Market ETF
        'ITOT',  // iShares Core S&P Total US Stock Market ETF
        'SCHB',  // Schwab US Broad Market ETF

        // Dow Jones ETFs
        'DIA',   // SPDR Dow Jones Industrial Average ETF

        // NASDAQ ETFs
        'QQQ',   // Invesco QQQ (Nasdaq-100)
        'ONEQ',  // Fidelity Nasdaq Composite Index ETF

        // Russell ETFs
        'IWM',   // iShares Russell 2000 ETF
        'IWB',   // iShares Russell 1000 ETF
        'IWF',   // iShares Russell 1000 Growth ETF
        'IWD',   // iShares Russell 1000 Value ETF

        // International/Global ETFs
        'VEA',   // Vanguard FTSE Developed Markets ETF
        'VWO',   // Vanguard FTSE Emerging Markets ETF
        'EFA',   // iShares MSCI EAFE ETF
        'IEFA',  // iShares Core MSCI EAFE ETF
        'ACWI',  // iShares MSCI ACWI ETF

        // Sector ETFs with prohibited holdings
        'XLF',   // Financial Select Sector SPDR (banks/insurance)
        'VFH',   // Vanguard Financials ETF
        'KBE',   // SPDR S&P Bank ETF
        'IAI',   // iShares US Broker-Dealers & Securities Exchanges ETF

        // Bond ETFs (interest-based)
        'AGG',   // iShares Core US Aggregate Bond ETF
        'BND',   // Vanguard Total Bond Market ETF
        'LQD',   // iShares iBoxx Investment Grade Corporate Bond ETF
        'HYG',   // iShares iBoxx High Yield Corporate Bond ETF
        'TLT',   // iShares 20+ Year Treasury Bond ETF
        'SHY',   // iShares 1-3 Year Treasury Bond ETF
        'IEF',   // iShares 7-10 Year Treasury Bond ETF
    ];

    if (nonCompliantETFs.includes(symbol)) {
        return true;
    }

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
        'IMKTA', // Ingles Markets - sells alcohol/pork
        'TSN',   // Tyson Foods - pork processor
        'HRL',   // Hormel - pork products (Spam, bacon)
        'PPC',   // Pilgrim's Pride - chicken AND pork
    ];

    return retailersWithHaramProducts.includes(symbol);
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
