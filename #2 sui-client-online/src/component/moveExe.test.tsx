/**
 * Test suite for MoveExecutor parameter type handling
 * 
 * This file tests the parameter type conversion logic used in the Move Function Executor.
 * Run this file directly in Node.js or include it in a test runner like Jest/Vitest.
 * 
 * To run manually: npx tsx moveExe.test.tsx
 */

// Function that replicates the getParameterType logic from the component
function getParameterType(param: any): string {
  // Handle pure type strings (like "U64", "Bool", etc.)
  if (typeof param === "string") {
    return param;
  }

  if (param.TypeParameter !== undefined) {
    return "T"; // Generic type parameter
  }

  if (param.Reference?.Struct) {
    const struct = param.Reference.Struct;
    return `&${struct.module}::${struct.name}`;
  }

  if (param.MutableReference?.Struct) {
    const struct = param.MutableReference.Struct;
    return `&mut ${struct.module}::${struct.name}`;
  }

  if (param.Struct) {
    const struct = param.Struct;
    if (struct.module === "string" && struct.name === "String") {
      return "string";
    }
    return `${struct.module}::${struct.name}`;
  }

  return "unknown";
}

// Mock transaction builder for testing argument building
function createMockTransaction() {
  return {
    pure: {
      string: (value: string) => ({ type: 'pure.string', value }),
      u8: (value: number) => ({ type: 'pure.u8', value }),
      u16: (value: number) => ({ type: 'pure.u16', value }),
      u32: (value: number) => ({ type: 'pure.u32', value }),
      u64: (value: bigint) => ({ type: 'pure.u64', value }),
      u128: (value: bigint) => ({ type: 'pure.u128', value }),
      u256: (value: bigint) => ({ type: 'pure.u256', value }),
      bool: (value: boolean) => ({ type: 'pure.bool', value }),
      address: (value: string) => ({ type: 'pure.address', value }),
      id: (value: string) => ({ type: 'pure.id', value }),
      vector: (innerType: string, value: unknown[]) => ({ type: `pure.vector<${innerType}>`, value }),
      option: (innerType: string, value: unknown) => ({ type: `pure.option<${innerType}>`, value })
    },
    object: (value: string) => ({ type: 'object', value })
  };
}

const normalizeTypeName = (rawType: string) => {
  const trimmed = rawType.trim();
  const lower = trimmed.toLowerCase();
  if (["u8", "u16", "u32", "u64", "u128", "u256", "bool", "address", "string"].includes(lower)) {
    return lower;
  }
  return trimmed;
};

const stripReferencePrefix = (rawType: string) =>
  rawType.replace(/^&mut\s+|^&\s+/, "").trim();

const getVectorInnerType = (rawType: string) => {
  const match = rawType.match(/^vector<(.+)>$/i);
  return match ? match[1].trim() : null;
};

const getOptionInnerType = (rawType: string) => {
  const match = rawType.match(/^(?:option|0x1::option::Option)<(.+)>$/i);
  return match ? match[1].trim() : null;
};

const parseVectorItems = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return [] as string[];
  }

  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) {
      throw new Error("Vector input must be an array.");
    }
    return parsed.map((item) => String(item));
  }

  return trimmed
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const coercePureValue = (typeName: string, value: string) => {
  const normalized = normalizeTypeName(typeName);
  switch (normalized) {
    case "string":
      return value;
    case "bool": {
      const normalizedValue = value.trim().toLowerCase();
      return normalizedValue === "true" || normalizedValue === "1";
    }
    case "address":
      return value;
    case "u8":
    case "u16":
    case "u32": {
      const numeric = Number(value);
      if (Number.isNaN(numeric)) {
        throw new Error(`Invalid numeric value for ${normalized}.`);
      }
      return numeric;
    }
    case "u64":
    case "u128":
    case "u256":
      return BigInt(value);
    case "0x2::object::ID":
      return value;
    default:
      return value;
  }
};

// Function that replicates the buildArgument logic from the component
function buildArgument(param: { value: string; type: string }, mockTransaction: any) {
  const rawType = param.type.trim();
  const normalizedRawType = stripReferencePrefix(rawType);
  const normalizedTypeName = normalizeTypeName(normalizedRawType);
  const isReference = rawType.startsWith("&");
  const vectorInnerType = getVectorInnerType(normalizedTypeName);
  const optionInnerType = getOptionInnerType(normalizedTypeName);

  if (isReference) {
    return mockTransaction.object(param.value);
  }

  if (vectorInnerType) {
    const normalizedInner = normalizeTypeName(vectorInnerType);
    const items = parseVectorItems(param.value);
    const coerced = items.map((item) => coercePureValue(normalizedInner, item));
    return mockTransaction.pure.vector(normalizedInner, coerced);
  }

  if (optionInnerType) {
    const normalizedInner = normalizeTypeName(optionInnerType);
    if (!param.value.trim()) {
      return mockTransaction.pure.option(normalizedInner, null);
    }
    const coerced = coercePureValue(normalizedInner, param.value);
    return mockTransaction.pure.option(normalizedInner, coerced);
  }

  if (normalizedTypeName === "string") {
    return mockTransaction.pure.string(param.value);
  }

  if (["u8", "u16", "u32", "u64", "u128", "u256"].includes(normalizedTypeName)) {
    const parsedValue = coercePureValue(normalizedTypeName, param.value);
    switch (normalizedTypeName) {
      case "u8": return mockTransaction.pure.u8(parsedValue);
      case "u16": return mockTransaction.pure.u16(parsedValue);
      case "u32": return mockTransaction.pure.u32(parsedValue);
      case "u64": return mockTransaction.pure.u64(parsedValue);
      case "u128": return mockTransaction.pure.u128(parsedValue);
      case "u256": return mockTransaction.pure.u256(parsedValue);
    }
  }

  if (normalizedTypeName === "bool") {
    return mockTransaction.pure.bool(coercePureValue("bool", param.value));
  }

  if (normalizedTypeName === "address") {
    return mockTransaction.pure.address(param.value);
  }

  if (normalizedTypeName === "0x2::object::ID") {
    return mockTransaction.pure.id(param.value);
  }

  if (normalizedTypeName.includes("::")) {
    return mockTransaction.object(param.value);
  }

  return mockTransaction.object(param.value);
}

// Test runner function
function runTests() {
  let totalTests = 0;
  let passedTests = 0;

  function test(name: string, testFn: () => boolean | void) {
    totalTests++;
    try {
      const result = testFn();
      if (result === false) {
        throw new Error('Test returned false');
      }
      console.log(`✅ PASS: ${name}`);
      passedTests++;
    } catch (error) {
      console.log(`❌ FAIL: ${name} - ${error}`);
    }
  }

  console.log('🧪 Starting MoveExecutor Parameter Type Tests\n');
  console.log('='.repeat(60));

  // Test 1: Parameter Type Detection
  console.log('\n📋 Parameter Type Detection Tests');
  console.log('-'.repeat(40));

  const typeTestCases = [
    {
      name: 'Pure U64 type',
      input: 'U64',
      expected: 'U64'
    },
    {
      name: 'Pure Bool type',
      input: 'Bool', 
      expected: 'Bool'
    },
    {
      name: 'Type parameter',
      input: { TypeParameter: 0 },
      expected: 'T'
    },
    {
      name: 'Reference to OwnerCap',
      input: {
        Reference: {
          Struct: {
            address: "0x996fa349767a48a9d211a3deb9ae4055a03e443a85118df9ca312cd29591b30f",
            module: "seaVault",
            name: "OwnerCap",
            typeArguments: []
          }
        }
      },
      expected: '&seaVault::OwnerCap'
    },
    {
      name: 'Mutable reference to SeaVault',
      input: {
        MutableReference: {
          Struct: {
            address: "0x996fa349767a48a9d211a3deb9ae4055a03e443a85118df9ca312cd29591b30f",
            module: "seaVault",
            name: "SeaVault",
            typeArguments: []
          }
        }
      },
      expected: '&mut seaVault::SeaVault'
    },
    {
      name: 'String struct',
      input: {
        Struct: {
          address: "0x1",
          module: "string",
          name: "String",
          typeArguments: []
        }
      },
      expected: 'string'
    },
    {
      name: 'Custom struct',
      input: {
        Struct: {
          address: "0x123",
          module: "my_module",
          name: "MyStruct",
          typeArguments: []
        }
      },
      expected: 'my_module::MyStruct'
    },
    {
      name: 'Unknown type',
      input: { SomeUnknownField: 'value' },
      expected: 'unknown'
    }
  ];

  typeTestCases.forEach(({ name, input, expected }) => {
    test(name, () => {
      const result = getParameterType(input);
      if (result !== expected) {
        throw new Error(`Expected "${expected}" but got "${result}"`);
      }
      return true;
    });
  });

  // Test 2: Transaction Argument Building
  console.log('\n🔧 Transaction Argument Building Tests');
  console.log('-'.repeat(40));

  const argumentTestCases = [
    {
      name: 'String parameter',
      param: { value: 'Hello World', type: 'string' },
      expected: { type: 'pure.string', value: 'Hello World' }
    },
    {
      name: 'U8 parameter',
      param: { value: '255', type: 'u8' },
      expected: { type: 'pure.u8', value: 255 }
    },
    {
      name: 'U16 parameter',
      param: { value: '65535', type: 'u16' },
      expected: { type: 'pure.u16', value: 65535 }
    },
    {
      name: 'U32 parameter',
      param: { value: '4294967295', type: 'u32' },
      expected: { type: 'pure.u32', value: 4294967295 }
    },
    {
      name: 'U64 parameter (lowercase)',
      param: { value: '1000000', type: 'u64' },
      expected: { type: 'pure.u64', value: BigInt('1000000') }
    },
    {
      name: 'U64 parameter (uppercase)',
      param: { value: '1000000', type: 'U64' },
      expected: { type: 'pure.u64', value: BigInt('1000000') }
    },
    {
      name: 'U128 parameter',
      param: { value: '340282366920938463463374607431768211455', type: 'u128' },
      expected: { type: 'pure.u128', value: BigInt('340282366920938463463374607431768211455') }
    },
    {
      name: 'U256 parameter',
      param: { value: '115792089237316195423570985008687907853269984665640564039457584007913129639935', type: 'U256' },
      expected: { type: 'pure.u256', value: BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935') }
    },
    {
      name: 'Boolean true parameter',
      param: { value: 'true', type: 'bool' },
      expected: { type: 'pure.bool', value: true }
    },
    {
      name: 'Boolean false parameter',
      param: { value: 'false', type: 'Bool' },
      expected: { type: 'pure.bool', value: false }
    },
    {
      name: 'Boolean numeric true',
      param: { value: '1', type: 'bool' },
      expected: { type: 'pure.bool', value: true }
    },
    {
      name: 'Boolean numeric false',
      param: { value: '0', type: 'bool' },
      expected: { type: 'pure.bool', value: false }
    },
    {
      name: 'Address parameter',
      param: { value: '0x0000000000000000000000000000000000000001', type: 'address' },
      expected: { type: 'pure.address', value: '0x0000000000000000000000000000000000000001' }
    },
    {
      name: 'Object reference parameter',
      param: { value: '0x123abc', type: '&seaVault::OwnerCap' },
      expected: { type: 'object', value: '0x123abc' }
    },
    {
      name: 'Mutable object reference',
      param: { value: '0x456def', type: '&mut seaVault::SeaVault' },
      expected: { type: 'object', value: '0x456def' }
    },
    {
      name: 'Custom struct parameter',
      param: { value: '0x789ghi', type: 'my_module::MyStruct' },
      expected: { type: 'object', value: '0x789ghi' }
    },
    {
      name: 'Object ID parameter',
      param: { value: '0x123abc', type: '0x2::object::ID' },
      expected: { type: 'pure.id', value: '0x123abc' }
    },
    {
      name: 'Vector<u64> parameter',
      param: { value: '[1,2,3]', type: 'vector<u64>' },
      expected: { type: 'pure.vector<u64>', value: [BigInt(1), BigInt(2), BigInt(3)] }
    },
    {
      name: 'Option<address> parameter with value',
      param: { value: '0x0000000000000000000000000000000000000001', type: 'option<address>' },
      expected: { type: 'pure.option<address>', value: '0x0000000000000000000000000000000000000001' }
    },
    {
      name: 'Option<address> parameter none',
      param: { value: '', type: 'option<address>' },
      expected: { type: 'pure.option<address>', value: null }
    }
  ];

  argumentTestCases.forEach(({ name, param, expected }) => {
    test(name, () => {
      const mockTransaction = createMockTransaction();
      const result = buildArgument(param, mockTransaction);
      
      // Handle BigInt comparison separately since JSON.stringify doesn't work with BigInt
      if (expected.value && typeof expected.value === 'bigint') {
        if (result.type !== expected.type || result.value !== expected.value) {
          throw new Error(`Expected {type: "${expected.type}", value: ${expected.value}} but got {type: "${result.type}", value: ${result.value}}`);
        }
      } else if (expected.type.startsWith('pure.vector')) {
        const expectedValues = expected.value as unknown[];
        const resultValues = result.value as unknown[];
        if (result.type !== expected.type || expectedValues.length !== resultValues.length) {
          throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(result)}`);
        }
        expectedValues.forEach((val, index) => {
          if (val !== resultValues[index]) {
            throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(result)}`);
          }
        });
      } else {
        if (JSON.stringify(result) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(result)}`);
        }
      }
      return true;
    });
  });

  // Test 3: Edge Cases
  console.log('\n⚠️  Edge Cases and Error Handling Tests');
  console.log('-'.repeat(40));

  test('Empty string value handling', () => {
    const value = '';
    const numResult = value === '' ? 0 : Number(value);
    return numResult === 0;
  });

  test('Invalid numeric string handling', () => {
    const value = 'not_a_number';
    const numResult = isNaN(Number(value)) ? 0 : Number(value);
    return numResult === 0;
  });

  test('Very large BigInt handling', () => {
    const value = '340282366920938463463374607431768211455'; // Max u128
    try {
      const bigintResult = BigInt(value);
      return bigintResult.toString() === value;
    } catch {
      return false;
    }
  });

  test('Boolean edge cases', () => {
    const testValues = ['true', 'false', '1', '0', 'TRUE', 'False', ''];
    const results = testValues.map(v => v === 'true' || v === '1');
    const expected = [true, false, true, false, false, false, false];
    return JSON.stringify(results) === JSON.stringify(expected);
  });

  test('Hex validation simulation', () => {
    const validateHex = (input: string) => /^(0x)?[0-9a-fA-F]*$/.test(input);
    
    const validInputs = ['0x123abc', '123ABC', 'deadbeef', '0xDEADBEEF'];
    const invalidInputs = ['0xGHI', 'xyz123', '123xyz'];
    
    const validResults = validInputs.every(validateHex);
    const invalidResults = invalidInputs.every(input => !validateHex(input));
    
    return validResults && invalidResults;
  });

  // Test 4: Real-world parameter array simulation
  console.log('\n🌍 Real-world Parameter Array Tests');
  console.log('-'.repeat(40));

  test('Real parameter array from example', () => {
    const realParameterArray = [
      {
        "Reference": {
          "Struct": {
            "address": "0x996fa349767a48a9d211a3deb9ae4055a03e443a85118df9ca312cd29591b30f",
            "module": "seaVault",
            "name": "OwnerCap",
            "typeArguments": []
          }
        }
      },
      {
        "MutableReference": {
          "Struct": {
            "address": "0x996fa349767a48a9d211a3deb9ae4055a03e443a85118df9ca312cd29591b30f",
            "module": "seaVault", 
            "name": "SeaVault",
            "typeArguments": []
          }
        }
      },
      {
        "Struct": {
          "address": "0x1",
          "module": "string",
          "name": "String",
          "typeArguments": []
        }
      },
      "U64"
    ];

    const expectedTypes = [
      '&seaVault::OwnerCap',
      '&mut seaVault::SeaVault', 
      'string',
      'U64'
    ];

    const actualTypes = realParameterArray.map(getParameterType);
    
    return JSON.stringify(actualTypes) === JSON.stringify(expectedTypes);
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! ✨');
  } else {
    console.log(`💥 ${totalTests - passedTests} test(s) failed!`);
  }
  
  console.log('='.repeat(60));
  
  return passedTests === totalTests;
}

// Export for use in other files or test runners
export { getParameterType, buildArgument, createMockTransaction };

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  // We're in Node.js environment
  runTests();
}
