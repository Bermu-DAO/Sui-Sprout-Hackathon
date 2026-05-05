"use client";

import {
  useCurrentAccount,
  useCurrentClient,
  useDAppKit,
} from "@mysten/dapp-kit-react";
import { Transaction } from "@mysten/sui/transactions";
import type { SuiGrpcClient } from "@mysten/sui/grpc";
import { useMemo, useState } from "react";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  LoadingSpinnerIcon,
} from "./icons/StatusIcons";

type BlockType =
  | "splitCoins"
  | "mergeCoins"
  | "transferObjects"
  | "moveCall"
  | "makeMoveVec"
  | "publish";

type InputMode = "manual" | "output";

type OutputRef = {
  blockId: string;
  outputIndex: number;
};

type InputSource = {
  mode: InputMode;
  manual: string;
  output: OutputRef | null;
};

type TypeParameter = {
  id: number;
  name: string;
  value: string;
};

type ParameterInput = {
  id: number;
  type: string;
  source: InputSource;
};

type MoveFunctionDescriptor = {
  name?: string | null;
  parameters?: OpenSignatureDescriptor[];
  typeParameters?: unknown[];
};

type OpenSignatureDescriptor = {
  reference?: number;
  body?: SignatureBodyDescriptor;
};

type SignatureBodyDescriptor = {
  type?: number;
  typeName?: string | null;
  typeParameterInstantiation?: SignatureBodyDescriptor[];
  typeParameter?: number;
};

type MovePackageModuleDescriptor = {
  name?: string | null;
  functions?: MoveFunctionDescriptor[];
};

type MoveCallBlockData = {
  movePackage: string;
  selectedModule: string;
  selectedFunction: string;
  modules: string[];
  functions: string[];
  typeParameters: TypeParameter[];
  parameters: ParameterInput[];
  moduleFunctionMap: Record<string, MoveFunctionDescriptor[]>;
  isFetchingModules: boolean;
  queryError: string | null;
};

type Block = {
  id: string;
  type: BlockType;
  title: string;
  description: string;
  inputs: Record<string, InputSource>;
  moveCall?: MoveCallBlockData;
};

type ExecutionStatus = "idle" | "running" | "success" | "error";

type ExecutionResult = {
  status: ExecutionStatus;
  message: string;
  digest?: string;
};

const SIGNATURE_BODY_TYPE = {
  ADDRESS: 1,
  BOOL: 2,
  U8: 3,
  U16: 4,
  U32: 5,
  U64: 6,
  U128: 7,
  U256: 8,
  VECTOR: 9,
  DATATYPE: 10,
  TYPE_PARAMETER: 11,
} as const;

const SIGNATURE_REFERENCE = {
  IMMUTABLE: 1,
  MUTABLE: 2,
} as const;

const OPERATIONS: Array<{ type: BlockType; title: string; description: string }> = [
  {
    type: "splitCoins",
    title: "Split Coins",
    description: "Create multiple coins from one source coin.",
  },
  {
    type: "mergeCoins",
    title: "Merge Coins",
    description: "Consolidate coins into a destination coin.",
  },
  {
    type: "transferObjects",
    title: "Transfer Objects",
    description: "Send objects to a recipient address.",
  },
  {
    type: "moveCall",
    title: "Move Call",
    description: "Invoke a Move function with typed arguments.",
  },
  {
    type: "makeMoveVec",
    title: "Make Move Vec",
    description: "Build a vector of objects for Move calls.",
  },
  {
    type: "publish",
    title: "Publish Package",
    description: "Publish a Move package from modules + deps.",
  },
];

const createInput = (manual = ""): InputSource => ({
  mode: "manual",
  manual,
  output: null,
});

const createBlock = (type: BlockType, index: number): Block => {
  const id = `${type}-${Date.now()}-${index}`;
  switch (type) {
    case "splitCoins":
      return {
        id,
        type,
        title: "Split Coins",
        description: "Create new coins from a source coin.",
        inputs: {
          coin: createInput(""),
          amounts: createInput("[100, 200]"),
        },
      };
    case "mergeCoins":
      return {
        id,
        type,
        title: "Merge Coins",
        description: "Merge multiple coins into one destination.",
        inputs: {
          destination: createInput(""),
          sources: createInput(""),
        },
      };
    case "transferObjects":
      return {
        id,
        type,
        title: "Transfer Objects",
        description: "Transfer a list of objects to an address.",
        inputs: {
          objects: createInput(""),
          address: createInput(""),
        },
      };
    case "makeMoveVec":
      return {
        id,
        type,
        title: "Make Move Vec",
        description: "Create a Move vector of objects.",
        inputs: {
          vecType: createInput(""),
          elements: createInput(""),
        },
      };
    case "publish":
      return {
        id,
        type,
        title: "Publish Package",
        description: "Publish modules and dependencies.",
        inputs: {
          modules: createInput("[]"),
          dependencies: createInput("[]"),
        },
      };
    case "moveCall":
      return {
        id,
        type,
        title: "Move Call",
        description: "Call into a Move module function.",
        inputs: {},
        moveCall: {
          movePackage: "",
          selectedModule: "",
          selectedFunction: "",
          modules: [],
          functions: [],
          typeParameters: [],
          parameters: [],
          moduleFunctionMap: {},
          isFetchingModules: false,
          queryError: null,
        },
      };
    default:
      return {
        id,
        type,
        title: "Operation",
        description: "",
        inputs: {},
      };
  }
};

const describeSignatureBody = (body?: SignatureBodyDescriptor): string => {
  if (!body) {
    return "unknown";
  }

  switch (body.type) {
    case SIGNATURE_BODY_TYPE.ADDRESS:
      return "address";
    case SIGNATURE_BODY_TYPE.BOOL:
      return "bool";
    case SIGNATURE_BODY_TYPE.U8:
      return "u8";
    case SIGNATURE_BODY_TYPE.U16:
      return "u16";
    case SIGNATURE_BODY_TYPE.U32:
      return "u32";
    case SIGNATURE_BODY_TYPE.U64:
      return "u64";
    case SIGNATURE_BODY_TYPE.U128:
      return "u128";
    case SIGNATURE_BODY_TYPE.U256:
      return "u256";
    case SIGNATURE_BODY_TYPE.VECTOR: {
      const inner = body.typeParameterInstantiation?.[0];
      const innerDescription = inner ? describeSignatureBody(inner) : "unknown";
      return `vector<${innerDescription}>`;
    }
    case SIGNATURE_BODY_TYPE.DATATYPE: {
      const base = body.typeName ?? "datatype";
      if (body.typeParameterInstantiation?.length) {
        const generics = body.typeParameterInstantiation
          .map((param) => describeSignatureBody(param))
          .join(", ");
        return `${base}<${generics}>`;
      }
      return base;
    }
    case SIGNATURE_BODY_TYPE.TYPE_PARAMETER:
      return `T${body.typeParameter ?? ""}`;
    default:
      return "unknown";
  }
};

const describeParameterSignature = (signature?: OpenSignatureDescriptor): string => {
  const prefix =
    signature?.reference === SIGNATURE_REFERENCE.MUTABLE
      ? "&mut "
      : signature?.reference === SIGNATURE_REFERENCE.IMMUTABLE
        ? "&"
        : "";

  return `${prefix}${describeSignatureBody(signature?.body)}`;
};

const isTxContextParameter = (signature?: OpenSignatureDescriptor) => {
  const typeName = signature?.body?.typeName;
  return typeof typeName === "string" && typeName.includes("tx_context::TxContext");
};

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

const parseListInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return [] as string[];
  }

  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) {
      throw new Error("Input must be a JSON array.");
    }
    return parsed.map((item) => String(item));
  }

  return trimmed
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const parseVectorItems = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return [] as string[];
  }

  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) {
      throw new Error("Vector input must be a JSON array.");
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
      try {
        return BigInt(value);
      } catch {
        throw new Error(`Invalid bigint value for ${normalized}.`);
      }
    case "0x2::object::ID":
      return value;
    default:
      return value;
  }
};

const MoveExecutor: React.FC = () => {
  const currentClient = useCurrentClient() as SuiGrpcClient | null;
  const currentAccount = useCurrentAccount();
  const dAppKit = useDAppKit();

  const [searchText, setSearchText] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([createBlock("moveCall", 0)]);
  const [enteringBlocks, setEnteringBlocks] = useState<Set<string>>(new Set());
  const [exitingBlocks, setExitingBlocks] = useState<Set<string>>(new Set());
  const [execution, setExecution] = useState<ExecutionResult>({
    status: "idle",
    message: "Ready to build a transaction.",
  });

  const filteredOperations = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) {
      return OPERATIONS;
    }
    return OPERATIONS.filter((op) =>
      [op.title, op.description, op.type].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [searchText]);

  const blockIndexMap = useMemo(() => {
    return blocks.reduce<Record<string, number>>((acc, block, index) => {
      acc[block.id] = index;
      return acc;
    }, {});
  }, [blocks]);

  const outputOptions = useMemo(() => {
    return blocks.map((block, index) => ({
      blockId: block.id,
      label: `Step ${index + 1}: ${block.title}`,
    }));
  }, [blocks]);

  const updateBlock = (id: string, updater: (block: Block) => Block) => {
    setBlocks((prev) => prev.map((block) => (block.id === id ? updater(block) : block)));
  };

  const updateInput = (blockId: string, key: string, nextInput: InputSource) => {
    updateBlock(blockId, (block) => ({
      ...block,
      inputs: {
        ...block.inputs,
        [key]: nextInput,
      },
    }));
  };

  const addBlock = (type: BlockType) => {
    const newBlock = createBlock(type, blocks.length);
    setBlocks((prev) => [...prev, newBlock]);
    setEnteringBlocks((prev) => new Set(prev).add(newBlock.id));
    setTimeout(() => {
      setEnteringBlocks((prev) => {
        const next = new Set(prev);
        next.delete(newBlock.id);
        return next;
      });
    }, 350);
  };

  const removeBlock = (blockId: string) => {
    setExitingBlocks((prev) => new Set(prev).add(blockId));
    setTimeout(() => {
      setBlocks((prev) => prev.filter((block) => block.id !== blockId));
      setExitingBlocks((prev) => {
        const next = new Set(prev);
        next.delete(blockId);
        return next;
      });
    }, 200);
  };

  const moveBlock = (blockId: string, direction: "up" | "down") => {
    setBlocks((prev) => {
      const index = prev.findIndex((block) => block.id === blockId);
      if (index === -1) {
        return prev;
      }
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= prev.length) {
        return prev;
      }
      const updated = [...prev];
      const [removed] = updated.splice(index, 1);
      updated.splice(nextIndex, 0, removed);
      return updated;
    });
  };

  const resolveOutputRef = (
    ref: OutputRef | null,
    outputs: Array<Array<unknown>>
  ) => {
    if (!ref) {
      throw new Error("Select an output source.");
    }
    const targetIndex = blockIndexMap[ref.blockId];
    if (targetIndex === undefined || targetIndex >= outputs.length) {
      throw new Error("Output source is not available yet.");
    }
    const blockOutputs = outputs[targetIndex] ?? [];
    if (ref.outputIndex < 0 || ref.outputIndex >= blockOutputs.length) {
      throw new Error("Output index is out of range.");
    }
    return blockOutputs[ref.outputIndex];
  };

  const resolveInputValue = (
    input: InputSource,
    outputs: Array<Array<unknown>>
  ) => {
    if (input.mode === "output") {
      return resolveOutputRef(input.output, outputs);
    }
    return input.manual;
  };

  const resolveObjectInput = (
    tx: Transaction,
    input: InputSource,
    outputs: Array<Array<unknown>>
  ) => {
    if (input.mode === "output") {
      return resolveOutputRef(input.output, outputs);
    }
    if (!input.manual.trim()) {
      throw new Error("Missing object id.");
    }
    return tx.object(input.manual.trim());
  };

  const resolveObjectListInput = (
    tx: Transaction,
    input: InputSource,
    outputs: Array<Array<unknown>>
  ) => {
    if (input.mode === "output") {
      const value = resolveOutputRef(input.output, outputs);
      return Array.isArray(value) ? value : [value];
    }
    const list = parseListInput(input.manual);
    if (!list.length) {
      throw new Error("Provide at least one object id.");
    }
    return list.map((item) => tx.object(item));
  };

  const resolveAddressInput = (
    tx: Transaction,
    input: InputSource,
    outputs: Array<Array<unknown>>
  ) => {
    if (input.mode === "output") {
      return resolveOutputRef(input.output, outputs);
    }
    if (!input.manual.trim()) {
      throw new Error("Provide a recipient address.");
    }
    return tx.pure.address(input.manual.trim());
  };

  const extractOutputs = (result: unknown) => {
    if (Array.isArray(result)) {
      return [result, ...result];
    }
    return [result];
  };

  const handleQueryPackage = async (blockId: string) => {
    updateBlock(blockId, (block) => {
      if (!block.moveCall) {
        return block;
      }
      return {
        ...block,
        moveCall: {
          ...block.moveCall,
          isFetchingModules: true,
          queryError: null,
        },
      };
    });

    const block = blocks.find((item) => item.id === blockId);
    if (!block?.moveCall) {
      return;
    }

    if (!block.moveCall.movePackage.trim()) {
      updateBlock(blockId, (item) => ({
        ...item,
        moveCall: item.moveCall
          ? { ...item.moveCall, queryError: "Enter a package ID before querying." }
          : item.moveCall,
      }));
      return;
    }

    if (!currentClient?.movePackageService) {
      updateBlock(blockId, (item) => ({
        ...item,
        moveCall: item.moveCall
          ? {
              ...item.moveCall,
              queryError: "The current client does not support Move package queries.",
              isFetchingModules: false,
            }
          : item.moveCall,
      }));
      return;
    }

    try {
      const { response } = await currentClient.movePackageService.getPackage({
        packageId: block.moveCall.movePackage.trim(),
      });

      const moduleDescriptors = (response.package?.modules ?? []) as MovePackageModuleDescriptor[];
      const moduleNames: string[] = [];
      const moduleFunctionMap: Record<string, MoveFunctionDescriptor[]> = {};

      moduleDescriptors.forEach((module) => {
        const moduleName = module?.name ?? undefined;
        if (!moduleName) {
          return;
        }
        moduleNames.push(moduleName);
        moduleFunctionMap[moduleName] = module.functions ?? [];
      });

      updateBlock(blockId, (item) => ({
        ...item,
        moveCall: item.moveCall
          ? {
              ...item.moveCall,
              modules: moduleNames,
              functions: [],
              selectedModule: "",
              selectedFunction: "",
              moduleFunctionMap,
              isFetchingModules: false,
              queryError: null,
              typeParameters: [],
              parameters: [],
            }
          : item.moveCall,
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load Move package metadata.";
      updateBlock(blockId, (item) => ({
        ...item,
        moveCall: item.moveCall
          ? { ...item.moveCall, queryError: message, isFetchingModules: false }
          : item.moveCall,
      }));
    }
  };

  const handleModuleChange = (blockId: string, moduleName: string) => {
    updateBlock(blockId, (block) => {
      if (!block.moveCall) {
        return block;
      }
      const descriptors = block.moveCall.moduleFunctionMap[moduleName] ?? [];
      const functionNames = descriptors
        .map((fn) => fn.name ?? "")
        .filter((name) => name.length > 0);
      return {
        ...block,
        moveCall: {
          ...block.moveCall,
          selectedModule: moduleName,
          selectedFunction: "",
          functions: functionNames,
          parameters: [],
          typeParameters: [],
        },
      };
    });
  };

  const handleFunctionChange = (blockId: string, functionName: string) => {
    updateBlock(blockId, (block) => {
      if (!block.moveCall) {
        return block;
      }
      const descriptors = block.moveCall.moduleFunctionMap[block.moveCall.selectedModule] ?? [];
      const descriptor = descriptors.find((fn) => fn.name === functionName);
      if (!descriptor) {
        return {
          ...block,
          moveCall: {
            ...block.moveCall,
            selectedFunction: functionName,
            parameters: [],
            typeParameters: [],
          },
        };
      }

      const parameterDescriptors = descriptor.parameters?.filter(
        (signature) => !isTxContextParameter(signature)
      ) ?? [];

      const parameters = parameterDescriptors.map((param, index) => ({
        id: index,
        type: describeParameterSignature(param),
        source: createInput(""),
      }));

      const typeParamCount = descriptor.typeParameters?.length ?? 0;
      const typeParameters = Array.from({ length: typeParamCount }, (_, index) => ({
        id: index,
        name: `T${index}`,
        value: "",
      }));

      return {
        ...block,
        moveCall: {
          ...block.moveCall,
          selectedFunction: functionName,
          parameters,
          typeParameters,
        },
      };
    });
  };

  const updateMoveCallInput = (blockId: string, field: keyof MoveCallBlockData, value: string) => {
    updateBlock(blockId, (block) => {
      if (!block.moveCall) {
        return block;
      }
      return {
        ...block,
        moveCall: {
          ...block.moveCall,
          [field]: value,
        },
      };
    });
  };

  const updateMoveCallTypeParameter = (
    blockId: string,
    paramId: number,
    value: string
  ) => {
    updateBlock(blockId, (block) => {
      if (!block.moveCall) {
        return block;
      }
      return {
        ...block,
        moveCall: {
          ...block.moveCall,
          typeParameters: block.moveCall.typeParameters.map((param) =>
            param.id === paramId ? { ...param, value } : param
          ),
        },
      };
    });
  };

  const updateMoveCallParameter = (
    blockId: string,
    paramId: number,
    updater: (param: ParameterInput) => ParameterInput
  ) => {
    updateBlock(blockId, (block) => {
      if (!block.moveCall) {
        return block;
      }
      return {
        ...block,
        moveCall: {
          ...block.moveCall,
          parameters: block.moveCall.parameters.map((param) =>
            param.id === paramId ? updater(param) : param
          ),
        },
      };
    });
  };

  const addMoveCallParameter = (blockId: string) => {
    updateBlock(blockId, (block) => {
      if (!block.moveCall) {
        return block;
      }
      const nextId = block.moveCall.parameters.length
        ? Math.max(...block.moveCall.parameters.map((param) => param.id)) + 1
        : 0;
      return {
        ...block,
        moveCall: {
          ...block.moveCall,
          parameters: [
            ...block.moveCall.parameters,
            { id: nextId, type: "string", source: createInput("") },
          ],
        },
      };
    });
  };

  const removeMoveCallParameter = (blockId: string, paramId: number) => {
    updateBlock(blockId, (block) => {
      if (!block.moveCall) {
        return block;
      }
      return {
        ...block,
        moveCall: {
          ...block.moveCall,
          parameters: block.moveCall.parameters.filter((param) => param.id !== paramId),
        },
      };
    });
  };

  const resolveMoveCallArgument = (
    tx: Transaction,
    param: ParameterInput,
    outputs: Array<Array<unknown>>
  ) => {
    if (param.source.mode === "output") {
      return resolveOutputRef(param.source.output, outputs);
    }

    const rawType = param.type.trim();
    const normalizedRawType = stripReferencePrefix(rawType);
    const normalizedTypeName = normalizeTypeName(normalizedRawType);
    const isReference = rawType.startsWith("&");
    const vectorInnerType = getVectorInnerType(normalizedTypeName);
    const optionInnerType = getOptionInnerType(normalizedTypeName);

    if (!param.source.manual.trim() && !vectorInnerType && !optionInnerType) {
      throw new Error(`Missing value for ${rawType}.`);
    }

    if (isReference) {
      return tx.object(param.source.manual);
    }

    if (vectorInnerType) {
      const normalizedInner = normalizeTypeName(vectorInnerType);
      const items = parseVectorItems(param.source.manual);
      const coerced = items.map((item) => coercePureValue(normalizedInner, item));
      return tx.pure.vector(normalizedInner as any, coerced);
    }

    if (optionInnerType) {
      const normalizedInner = normalizeTypeName(optionInnerType);
      if (!param.source.manual.trim()) {
        return tx.pure.option(normalizedInner as any, null);
      }
      const coerced = coercePureValue(normalizedInner, param.source.manual);
      return tx.pure.option(normalizedInner as any, coerced);
    }

    if (normalizedTypeName === "string") {
      return tx.pure.string(param.source.manual);
    }

    if (["u8", "u16", "u32", "u64", "u128", "u256"].includes(normalizedTypeName)) {
      const parsedValue = coercePureValue(normalizedTypeName, param.source.manual);
      switch (normalizedTypeName) {
        case "u8":
          return tx.pure.u8(parsedValue as number);
        case "u16":
          return tx.pure.u16(parsedValue as number);
        case "u32":
          return tx.pure.u32(parsedValue as number);
        case "u64":
          return tx.pure.u64(parsedValue as bigint);
        case "u128":
          return tx.pure.u128(parsedValue as bigint);
        case "u256":
          return tx.pure.u256(parsedValue as bigint);
      }
    }

    if (normalizedTypeName === "bool") {
      return tx.pure.bool(coercePureValue("bool", param.source.manual) as boolean);
    }

    if (normalizedTypeName === "address") {
      return tx.pure.address(param.source.manual);
    }

    if (normalizedTypeName === "0x2::object::ID") {
      return tx.pure.id(param.source.manual);
    }

    return tx.object(param.source.manual);
  };

  const buildTransaction = () => {
    const tx = new Transaction();
    const outputs: Array<Array<unknown>> = [];

    blocks.forEach((block) => {
      const blockOutputs: Array<unknown> = [];

      switch (block.type) {
        case "splitCoins": {
          const coin = resolveObjectInput(tx, block.inputs.coin, outputs);
          const amountsInput = resolveInputValue(block.inputs.amounts, outputs);
          const amounts = Array.isArray(amountsInput)
            ? amountsInput
            : parseVectorItems(String(amountsInput));
          if (!amounts.length) {
            throw new Error("Split Coins needs at least one amount.");
          }
          const coerced = amounts.map((amount) => coercePureValue("u64", String(amount)));
          const result = tx.splitCoins(coin as any, coerced as any);
          blockOutputs.push(...extractOutputs(result));
          break;
        }
        case "mergeCoins": {
          const destination = resolveObjectInput(tx, block.inputs.destination, outputs);
          const sources = resolveObjectListInput(tx, block.inputs.sources, outputs);
          const result = tx.mergeCoins(destination as any, sources as any);
          blockOutputs.push(...extractOutputs(result));
          break;
        }
        case "transferObjects": {
          const objects = resolveObjectListInput(tx, block.inputs.objects, outputs);
          const address = resolveAddressInput(tx, block.inputs.address, outputs);
          const result = tx.transferObjects(objects as any, address as any);
          blockOutputs.push(...extractOutputs(result));
          break;
        }
        case "makeMoveVec": {
          const vecTypeInput = resolveInputValue(block.inputs.vecType, outputs);
          const elements = resolveObjectListInput(tx, block.inputs.elements, outputs);
          const type = String(vecTypeInput || "").trim();
          const result = tx.makeMoveVec({ type: type || undefined, elements: elements as any });
          blockOutputs.push(...extractOutputs(result));
          break;
        }
        case "publish": {
          const modulesInput = resolveInputValue(block.inputs.modules, outputs);
          const depsInput = resolveInputValue(block.inputs.dependencies, outputs);
          const modulesParsed = JSON.parse(String(modulesInput || "[]"));
          const depsParsed = JSON.parse(String(depsInput || "[]"));
          if (!Array.isArray(modulesParsed) || !Array.isArray(depsParsed)) {
            throw new Error("Publish inputs must be JSON arrays.");
          }
          const result = tx.publish({
            modules: modulesParsed as any,
            dependencies: depsParsed as string[],
          });
          blockOutputs.push(...extractOutputs(result));
          break;
        }
        case "moveCall": {
          if (!block.moveCall) {
            throw new Error("Move call block is missing configuration.");
          }
          const moveCall = block.moveCall;
          if (!moveCall.movePackage || !moveCall.selectedModule || !moveCall.selectedFunction) {
            throw new Error("Move call is missing package/module/function.");
          }
          if (moveCall.typeParameters.some((param) => !param.value.trim())) {
            throw new Error("Fill in all Move type parameters or remove them.");
          }
          const args = moveCall.parameters.map((param) =>
            resolveMoveCallArgument(tx, param, outputs)
          );
          const result = tx.moveCall({
            target: `${moveCall.movePackage}::${moveCall.selectedModule}::${moveCall.selectedFunction}`,
            typeArguments: moveCall.typeParameters
              .map((param) => param.value.trim())
              .filter(Boolean),
            arguments: args as any,
          });
          blockOutputs.push(...extractOutputs(result));
          break;
        }
        default:
          break;
      }

      outputs.push(blockOutputs.length ? blockOutputs : []);
    });

    return tx;
  };

  const handleExecute = async () => {
    setExecution({ status: "running", message: "Building transaction..." });

    if (!currentAccount?.address) {
      setExecution({
        status: "error",
        message: "Connect a wallet before executing.",
      });
      return;
    }

    try {
      const tx = buildTransaction();
      const result = await dAppKit.signAndExecuteTransaction({
        transaction: tx,
      });

      const digest =
        "digest" in result
          ? result.digest
          : result.Transaction?.digest ?? result.FailedTransaction?.digest;

      const digestValue = typeof digest === "string" ? digest : digest ? String(digest) : "";

      if (!digestValue) {
        throw new Error("Transaction submitted but no digest returned.");
      }

      setExecution({
        status: "success",
        message: "Transaction executed successfully.",
        digest: digestValue,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Transaction failed.";
      setExecution({ status: "error", message });
    }
  };

  const renderSourceToggle = (
    input: InputSource,
    onChange: (next: InputSource) => void,
    blockId: string
  ) => {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange({ ...input, mode: "manual" })}
          className={`px-3 py-1 text-xs rounded-full border transition-colors ${
            input.mode === "manual"
              ? "border-amber-400 bg-amber-50 text-amber-800"
              : "border-slate-200 text-slate-500 hover:text-slate-700"
          }`}
        >
          Manual
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...input, mode: "output" })}
          className={`px-3 py-1 text-xs rounded-full border transition-colors ${
            input.mode === "output"
              ? "border-teal-400 bg-teal-50 text-teal-800"
              : "border-slate-200 text-slate-500 hover:text-slate-700"
          }`}
        >
          Output
        </button>
      </div>
    );
  };

  const renderOutputPicker = (
    input: InputSource,
    onChange: (next: InputSource) => void,
    blockId: string
  ) => {
    const currentIndex = blockIndexMap[blockId] ?? 0;
    const availableBlocks = outputOptions.filter(
      (option) => blockIndexMap[option.blockId] < currentIndex
    );

    return (
      <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
        <select
          className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
          value={input.output?.blockId ?? ""}
          onChange={(event) =>
            onChange({
              ...input,
              mode: "output",
              output: event.target.value
                ? { blockId: event.target.value, outputIndex: input.output?.outputIndex ?? 0 }
                : null,
            })
          }
        >
          <option value="">Select step output</option>
          {availableBlocks.map((option) => (
            <option key={option.blockId} value={option.blockId}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
          value={input.output?.outputIndex ?? 0}
          onChange={(event) =>
            onChange({
              ...input,
              mode: "output",
              output: {
                blockId: input.output?.blockId ?? "",
                outputIndex: Number(event.target.value) || 0,
              },
            })
          }
        />
      </div>
    );
  };

  const renderInputField = (
    blockId: string,
    label: string,
    input: InputSource,
    onChange: (next: InputSource) => void,
    placeholder: string
  ) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        {renderSourceToggle(input, onChange, blockId)}
      </div>
      {input.mode === "manual" ? (
        <input
          type="text"
          className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
          placeholder={placeholder}
          value={input.manual}
          onChange={(event) => onChange({ ...input, manual: event.target.value })}
        />
      ) : (
        renderOutputPicker(input, onChange, blockId)
      )}
    </div>
  );

  const renderBlock = (block: Block, index: number) => {
    return (
      <div
        key={block.id}
        className={`rounded-xl border border-slate-200 bg-white/90 shadow-sm overflow-hidden ${
          enteringBlocks.has(block.id) ? "animate-block-enter" : ""
        } ${exitingBlocks.has(block.id) ? "animate-block-exit" : ""}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-white via-slate-50 to-amber-50">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Step {index + 1}
            </p>
            <h3 className="text-lg font-semibold text-slate-900">{block.title}</h3>
            <p className="text-sm text-slate-500">{block.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => moveBlock(block.id, "up")}
              className="px-2 py-1 text-xs text-slate-500 border border-slate-200 rounded hover:text-slate-700 active:scale-[0.93] transition-transform duration-75"
              title="Move up"
            >
              move up
            </button>
            <button
              type="button"
              onClick={() => moveBlock(block.id, "down")}
              className="px-2 py-1 text-xs text-slate-500 border border-slate-200 rounded hover:text-slate-700 active:scale-[0.93] transition-transform duration-75"
              title="Move down"
            >
              move down
            </button>
            <button
              type="button"
              onClick={() => removeBlock(block.id)}
              className="px-2 py-1 text-xs text-rose-600 border border-rose-100 rounded hover:bg-rose-50 active:scale-[0.93] transition-transform duration-75"
            >
              Remove
            </button>
          </div>
        </div>
        <div className="px-5 py-5 space-y-4">
          {block.type === "splitCoins" && (
            <>
              {renderInputField(
                block.id,
                "Source Coin",
                block.inputs.coin,
                (next) => updateInput(block.id, "coin", next),
                "0x..."
              )}
              {renderInputField(
                block.id,
                "Amounts",
                block.inputs.amounts,
                (next) => updateInput(block.id, "amounts", next),
                "[100, 200]"
              )}
            </>
          )}
          {block.type === "mergeCoins" && (
            <>
              {renderInputField(
                block.id,
                "Destination Coin",
                block.inputs.destination,
                (next) => updateInput(block.id, "destination", next),
                "0x..."
              )}
              {renderInputField(
                block.id,
                "Source Coins",
                block.inputs.sources,
                (next) => updateInput(block.id, "sources", next),
                "0xabc..., 0xdef..."
              )}
            </>
          )}
          {block.type === "transferObjects" && (
            <>
              {renderInputField(
                block.id,
                "Objects",
                block.inputs.objects,
                (next) => updateInput(block.id, "objects", next),
                "0xabc..., 0xdef..."
              )}
              {renderInputField(
                block.id,
                "Recipient",
                block.inputs.address,
                (next) => updateInput(block.id, "address", next),
                "0x..."
              )}
            </>
          )}
          {block.type === "makeMoveVec" && (
            <>
              {renderInputField(
                block.id,
                "Vector Type (optional)",
                block.inputs.vecType,
                (next) => updateInput(block.id, "vecType", next),
                "0x2::sui::SUI"
              )}
              {renderInputField(
                block.id,
                "Elements",
                block.inputs.elements,
                (next) => updateInput(block.id, "elements", next),
                "0xabc..., 0xdef..."
              )}
            </>
          )}
          {block.type === "publish" && (
            <>
              {renderInputField(
                block.id,
                "Modules (JSON array)",
                block.inputs.modules,
                (next) => updateInput(block.id, "modules", next),
                "[\"base64...\"]"
              )}
              {renderInputField(
                block.id,
                "Dependencies (JSON array)",
                block.inputs.dependencies,
                (next) => updateInput(block.id, "dependencies", next),
                "[\"0x2\", \"0x1\"]"
              )}
            </>
          )}
          {block.type === "moveCall" && block.moveCall && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Move Package</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
                    placeholder="0x..."
                    value={block.moveCall.movePackage}
                    onChange={(event) =>
                      updateMoveCallInput(block.id, "movePackage", event.target.value)
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleQueryPackage(block.id)}
                  className="h-10 px-4 mt-6 text-sm font-medium rounded-md bg-amber-500 text-white hover:bg-amber-600 active:scale-[0.96] transition-transform duration-75"
                  disabled={block.moveCall.isFetchingModules}
                >
                  {block.moveCall.isFetchingModules ? "Loading..." : "Query"}
                </button>
              </div>
              {block.moveCall.queryError && (
                <p className="text-sm text-rose-500">{block.moveCall.queryError}</p>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Module</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
                    value={block.moveCall.selectedModule}
                    onChange={(event) => handleModuleChange(block.id, event.target.value)}
                  >
                    <option value="">Select module</option>
                    {block.moveCall.modules.map((module) => (
                      <option key={module} value={module}>
                        {module}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Function</label>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
                    value={block.moveCall.selectedFunction}
                    onChange={(event) => handleFunctionChange(block.id, event.target.value)}
                  >
                    <option value="">Select function</option>
                    {block.moveCall.functions.map((func) => (
                      <option key={func} value={func}>
                        {func}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {block.moveCall.typeParameters.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Type Parameters
                  </p>
                  {block.moveCall.typeParameters.map((param) => (
                    <div key={param.id} className="grid gap-2 sm:grid-cols-[80px_1fr]">
                      <span className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm">
                        {param.name}
                      </span>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
                        placeholder="0x2::sui::SUI"
                        value={param.value}
                        onChange={(event) =>
                          updateMoveCallTypeParameter(block.id, param.id, event.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Parameters
                </p>
                {block.moveCall.parameters.map((param) => (
                  <div key={param.id} className="rounded-lg border border-slate-200 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">{param.type}</span>
                      {renderSourceToggle(param.source, (next) =>
                        updateMoveCallParameter(block.id, param.id, (p) => ({ ...p, source: next }))
                      , block.id)}
                    </div>
                    {param.source.mode === "manual" ? (
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm"
                        placeholder="Value"
                        value={param.source.manual}
                        onChange={(event) =>
                          updateMoveCallParameter(block.id, param.id, (p) => ({
                            ...p,
                            source: { ...p.source, manual: event.target.value },
                          }))
                        }
                      />
                    ) : (
                      renderOutputPicker(param.source, (next) =>
                        updateMoveCallParameter(block.id, param.id, (p) => ({ ...p, source: next }))
                      , block.id)
                    )}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeMoveCallParameter(block.id, param.id)}
                        className="text-xs text-rose-600 hover:text-rose-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addMoveCallParameter(block.id)}
                  className="w-full py-2 text-sm border border-dashed border-slate-300 rounded-md text-slate-500 hover:text-slate-700"
                >
                  + Add parameter
                </button>
              </div>
            </div>
          )}

          <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Outputs: use this step in later inputs by selecting output index (0, 1, 2...).
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl">
      <div className="mb-6">
        <h2 className="text-3xl font-semibold text-slate-800">Transaction Kitchen</h2>
        <p className="text-sm text-slate-800">
          Assemble programmable transaction blocks, wire outputs, and execute in one flow.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr] h-[calc(100vh-240px)] overflow-hidden">
        <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 p-4 shadow-lg overflow-auto">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Operations</p>
            <input
              type="text"
              className="mt-3 w-full rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100"
              placeholder="Search..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </div>
          <div className="space-y-3">
            {filteredOperations.map((op) => (
              <button
                key={op.type}
                type="button"
                onClick={() => addBlock(op.type)}
                className="w-full text-left rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-100 hover:border-amber-400/70 hover:text-amber-100 active:scale-[0.97] transition-all duration-75"
              >
                <p className="font-semibold">{op.title}</p>
                <p className="text-xs text-slate-400 mt-1">{op.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6 overflow-auto pr-2">
          <div className="rounded-2xl border border-slate-200/70 bg-white/95 p-6 shadow-xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Recipe</p>
                <h3 className="text-2xl font-semibold text-slate-900">Flow Editor</h3>
                <p className="text-sm text-slate-500">
                  Connect outputs by selecting a step and output index.
                </p>
              </div>
              <div className="text-right text-xs text-slate-500">
                Connected account: {currentAccount?.address ?? "Not connected"}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {blocks.map((block, index) => renderBlock(block, index))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Execution</p>
                <h3 className="text-xl font-semibold text-slate-900">Bake Transaction</h3>
                <p className="text-sm text-slate-500">
                  Digest-only output for quick confirmation.
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                {execution.status === "running" && <LoadingSpinnerIcon className="w-4 h-4" />}
                {execution.status === "success" && (
                  <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                )}
                {execution.status === "error" && (
                  <ExclamationTriangleIcon className="w-4 h-4 text-rose-500" />
                )}
                {execution.status === "idle" && (
                  <InformationCircleIcon className="w-4 h-4 text-slate-400" />
                )}
                <span>{execution.status.toUpperCase()}</span>
              </div>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p>{execution.message}</p>
              {execution.digest && (
                <p className="mt-2 font-mono text-xs text-slate-500 break-all">
                  Digest: {execution.digest}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleExecute}
              className="w-full py-3 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 active:scale-[0.98] transition-all duration-75"
            >
              Bake & Execute
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoveExecutor;
