import OCRService from './OCRService';

interface OCRTestResult {
  success: boolean;
  data?: any;
  processingTime?: string;
  timestamp: string;
  quality?: any;
  isValid?: boolean;
  error?: string;
}

const OCRServiceTest = {
  /**
   * Test Google Cloud Vision API integration
   */
  async testGoogleCloudVisionIntegration(imageUri: string): Promise<OCRTestResult> {
    console.log('Testing Google Cloud Vision API integration...');
    
    try {
      const startTime = Date.now();
      const result = await OCRService.extractReceiptData(imageUri);
      const endTime = Date.now();
      
      const testResult: OCRTestResult = {
        success: !!result,
        data: result,
        processingTime: `${endTime - startTime}ms`,
        timestamp: new Date().toISOString(),
      };

      if (result) {
        const quality = OCRService.getExtractionQuality(result as any);
        testResult.quality = quality;
        testResult.isValid = OCRService.validateExtraction(result as any);
      }

      console.log('Test Result:', testResult);
      return testResult;
    } catch (error: any) {
      console.error('Test failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  },

  /**
   * Test pattern matching fallback
   */
  async testPatternMatchingFallback(sampleText: string): Promise<OCRTestResult> {
    console.log('Testing pattern matching fallback...');
    
    try {
      const result = OCRService.parseReceiptText(sampleText);
      const quality = OCRService.getExtractionQuality(result as any);
      
      const testResult: OCRTestResult = {
        success: !!result,
        data: result,
        quality: quality,
        isValid: OCRService.validateExtraction(result as any),
        timestamp: new Date().toISOString(),
      };

      console.log('Pattern Matching Test Result:', testResult);
      return testResult;
    } catch (error: any) {
      console.error('Test failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  },

  /**
   * Test vendor extraction
   */
  testVendorExtraction(text: string): string | null {
    // @ts-ignore - access internal method
    const vendor = OCRService._extractVendor(text);
    console.log('Vendor Extraction Test:', { input: text, output: vendor });
    return vendor;
  },

  /**
   * Test amount extraction
   */
  testAmountExtraction(text: string): number | null {
    // @ts-ignore - access internal method
    const amount = OCRService._extractAmount(text);
    console.log('Amount Extraction Test:', { input: text, output: amount });
    return amount;
  },

  /**
   * Test date extraction
   */
  testDateExtraction(text: string): string {
    // @ts-ignore - access internal method
    const date = OCRService._extractDate(text);
    console.log('Date Extraction Test:', { input: text, output: date });
    return date;
  },

  /**
   * Test receipt type detection
   */
  testReceiptTypeDetection(text: string): string {
    // @ts-ignore - access internal method
    const type = OCRService._detectReceiptType(text);
    console.log('Receipt Type Detection Test:', { input: text, output: type });
    return type;
  },

  /**
   * Run all tests with sample data
   */
  async runAllTests(): Promise<any[]> {
    console.log('=== Running All OCR Service Tests ===\n');

    const sampleReceipt = `
      STARBUCKS COFFEE
      123 Main Street
      New York, NY 10001
      
      Date: 02/08/2026
      Time: 10:30 AM
      
      Venti Latte          $5.45
      Blueberry Muffin     $4.50
      
      Subtotal:            $9.95
      Tax:                 $0.85
      Total:              $10.80
      
      Thank you for your purchase!
    `;

    const sampleInvoice = `
      INVOICE
      Invoice Number: INV-2026-001234
      
      ABC Corporation
      456 Business Ave
      San Francisco, CA 94105
      
      Date: February 8, 2026
      Due Date: February 28, 2026
      
      Description              Amount
      Professional Services    $5,000.00
      
      Subtotal:               $5,000.00
      Tax (10%):                $500.00
      Total Due:              $5,500.00
    `;

    const sampleBill = `
      UTILITY BILL
      Account Number: 123456789
      
      Service Period: Jan 1 - Jan 31, 2026
      
      Previous Balance:        $0.00
      Current Charges:       $125.50
      
      Amount Due:            $125.50
      Due Date: February 15, 2026
    `;

    const tests = [
      {
        name: 'Retail Receipt Parsing',
        fn: () => this.testPatternMatchingFallback(sampleReceipt),
      },
      {
        name: 'Invoice Parsing',
        fn: () => this.testPatternMatchingFallback(sampleInvoice),
      },
      {
        name: 'Bill Parsing',
        fn: () => this.testPatternMatchingFallback(sampleBill),
      },
      {
        name: 'Vendor Extraction',
        fn: () => this.testVendorExtraction(sampleReceipt),
      },
      {
        name: 'Amount Extraction',
        fn: () => this.testAmountExtraction(sampleReceipt),
      },
      {
        name: 'Date Extraction',
        fn: () => this.testDateExtraction(sampleReceipt),
      },
      {
        name: 'Receipt Type Detection',
        fn: () => this.testReceiptTypeDetection(sampleInvoice),
      },
    ];

    const results: any[] = [];
    for (const test of tests) {
      console.log(`\n--- ${test.name} ---`);
      try {
        const result = await test.fn();
        results.push({ name: test.name, result, passed: true });
      } catch (error: any) {
        console.error(`Test failed: ${error.message}`);
        results.push({ name: test.name, error: error.message, passed: false });
      }
    }

    console.log('\n=== Test Summary ===');
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    console.log(`Passed: ${passed}/${total}`);
    
    return results;
  },
};

export default OCRServiceTest;
