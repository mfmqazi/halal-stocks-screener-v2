import yahooFinanceService from './services/yahooFinanceService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🧪 Testing Yahoo Finance API Connection...\n');

async function testAPI() {
    try {
        console.log('\n📊 Fetching AAPL stock data...\n');

        const stockData = await yahooFinanceService.getStockData('AAPL');

        if (stockData) {
            console.log('✅ SUCCESS! Stock data retrieved:\n');
            console.log(`Symbol: ${stockData.symbol}`);
            console.log(`Company: ${stockData.company}`);
            console.log(`Price: $${stockData.price}`);
            console.log(`Change: ${stockData.change > 0 ? '+' : ''}${stockData.change.toFixed(2)}%`);
            console.log(`Market Cap: ${stockData.marketCap}`);
            console.log(`Sector: ${stockData.sector}`);
            console.log(`\n📋 Shariah Metrics:`);
            console.log(`  Debt Ratio: ${(stockData.debtRatio * 100).toFixed(1)}%`);
            console.log(`  Liquid Assets: ${(stockData.liquidAssetsRatio * 100).toFixed(1)}%`);
            console.log(`  Receivables: ${(stockData.receivablesRatio * 100).toFixed(1)}%`);
            console.log(`  Interest Income: ${(stockData.interestIncome * 100).toFixed(1)}%`);

            const screened = yahooFinanceService.screenStock(stockData);
            console.log(`\n✨ Compliance Score: ${screened.complianceScore}/100`);
            console.log(`Status: ${screened.isCompliant ? '✅ HALAL' : '❌ NOT COMPLIANT'}`);

            if (screened.issues.length > 0) {
                console.log('\n⚠️  Issues:');
                screened.issues.forEach(issue => console.log(`  - ${issue}`));
            }

            console.log('\n🎉 Yahoo Finance API is working correctly!');
        } else {
            console.log('❌ Failed to retrieve stock data');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testAPI();
