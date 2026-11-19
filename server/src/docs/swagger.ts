/**
 * OpenAPI 3.0.3 Specification for the Fuel Wallet API (محفظة الوقود الرقمية).
 *
 * Served interactively via Swagger UI at `GET /api-docs` and as raw JSON at `GET /api-docs.json`.
 */
export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Fuel Wallet API — توثيق واجهة برمجة تطبيقات محفظة الوقود الرقمية',
    version: '1.0.0',
    description:
      'منصة الدفع المسبق الذكية لمحطات الوقود بنظام القيد المزدوج الصارم (Double-Entry Ledger) ومنع التكرار (Idempotency) والمصادقة عبر Clerk JWT.\n\n' +
      '**Prepaid Digital Fuel Wallet Platform** with strict Double-Entry Accounting, Idempotency-Key protection, PostgreSQL guarded atomic balance updates, and Clerk JWT Authentication.',
    contact: {
      name: 'Fuel Wallet Engineering Team',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local Development Server (خادم التطوير المحلي)',
    },
  ],
  tags: [
    {
      name: 'Health',
      description: 'فحص جاهزية الخادم وقاعدة البيانات — Server & Database Health',
    },
    {
      name: 'User & Wallets (/api/me, /api/wallets)',
      description:
        'بيانات المستخدم الحالي، المحفظة الرئيسية، محافظ المحطات، وكشف الحساب — Current User Profile, Wallets & Ledger Statements',
    },
    {
      name: 'Stations (/api/stations)',
      description:
        'استعراض وإدارة محطات الوقود (إضافة، تعديل، حذف، وتصفية حسب المدينة) — Fuel Stations Discovery & CRUD',
    },
    {
      name: 'Money Operations (/api/topups, /api/transfers, /api/payments)',
      description:
        'العمليات المالية المحمية بمفتاح عدم التكرار (Idempotency-Key): تغذية الرصيد، التحويل بين المحافظ، والدفع في المحطات — Idempotent Financial Transactions',
    },
    {
      name: 'Transactions History (/api/transactions)',
      description:
        'سجل العمليات المالية مع التصفح بالمؤشر (Cursor Pagination) وتفاصيل كل عملية — Cursor-Paginated Transaction History',
    },
    {
      name: 'Operator Tools (/api/operator)',
      description:
        'أدوات مشغل المحطة: ملخص الإيرادات اليومية، التحقق من الرمز السداسي (6-digit Code)، وتحديث حالة الازدحام — Station Operator Dashboard Endpoints',
    },
    {
      name: 'Admin Tools (/api/admin)',
      description:
        'أدوات مدير النظام: مفتاح محاكاة البنك (UP/DOWN)، مطابقة القيد المزدوج (Reconcile)، وإدارة المحطات والمستخدمين — System Administration & Ledger Reconciliation',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Clerk Session JWT token (`Authorization: Bearer <token>`). Obtain from Clerk session in browser or test token.',
      },
    },
    parameters: {
      IdempotencyKeyHeader: {
        name: 'Idempotency-Key',
        in: 'header',
        required: true,
        schema: {
          type: 'string',
          minLength: 8,
          maxLength: 128,
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
        description:
          'مفتاح عدم التكرار (UUID v4) لضمان تنفيذ العملية المالية مرة واحدة فقط عند انقطاع الشبكة أو إعادة المحاولة.',
      },
    },
    schemas: {
      ErrorEnvelope: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                example: 'INSUFFICIENT_FUNDS',
              },
              message: {
                type: 'string',
                example: 'الرصيد غير كافٍ لإتمام العملية',
              },
              details: {
                nullable: true,
              },
            },
            required: ['code', 'message'],
          },
        },
      },
      MeResponse: {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              fullName: { type: 'string', nullable: true, example: 'أحمد محمد' },
              role: {
                type: 'string',
                enum: ['DRIVER', 'OPERATOR', 'ADMIN'],
                example: 'DRIVER',
              },
              status: {
                type: 'string',
                enum: ['ACTIVE', 'FROZEN'],
                example: 'ACTIVE',
              },
              operatorStationId: {
                type: 'string',
                format: 'uuid',
                nullable: true,
              },
            },
          },
          wallets: {
            type: 'object',
            properties: {
              main: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  walletNumber: { type: 'integer', example: 104829 },
                  balance: { type: 'integer', example: 30000 },
                },
              },
              stations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    walletId: { type: 'string', format: 'uuid' },
                    walletNumber: { type: 'integer', example: 482910 },
                    stationId: { type: 'string', format: 'uuid' },
                    stationName: { type: 'string', example: 'محطة النيل' },
                    balance: { type: 'integer', example: 8000 },
                  },
                },
              },
            },
          },
          totalBalance: { type: 'integer', example: 38000 },
        },
      },
      StationDto: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'محطة النيل' },
          city: { type: 'string', example: 'أم درمان' },
          address: { type: 'string', nullable: true, example: 'شارع الموردة' },
          isActive: { type: 'boolean', example: true },
          congestion: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH'],
            example: 'LOW',
          },
          myStationWalletId: { type: 'string', format: 'uuid', nullable: true },
          myStationBalance: { type: 'integer', example: 8000 },
          mainBalance: { type: 'integer', example: 10000 },
          availableHere: { type: 'integer', example: 18000 },
        },
      },
      CreateStationInput: {
        type: 'object',
        required: ['name', 'city'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 120, example: 'محطة المستقبل' },
          city: { type: 'string', minLength: 2, maxLength: 80, example: 'الخرطوم' },
          address: { type: 'string', maxLength: 200, nullable: true, example: 'شارع المطار' },
          congestion: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH'],
            default: 'LOW',
          },
          isActive: { type: 'boolean', default: true },
        },
      },
      UpdateStationInput: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 120 },
          city: { type: 'string', minLength: 2, maxLength: 80 },
          address: { type: 'string', maxLength: 200, nullable: true },
          congestion: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
          isActive: { type: 'boolean' },
        },
      },
      TransactionDto: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          seq: { type: 'integer', example: 42 },
          reference: { type: 'string', example: 'FW-20261114-000042' },
          type: {
            type: 'string',
            enum: ['TOPUP', 'TRANSFER', 'PAYMENT'],
            example: 'PAYMENT',
          },
          status: {
            type: 'string',
            enum: ['PENDING', 'COMPLETED', 'FAILED'],
            example: 'COMPLETED',
          },
          userId: { type: 'string', format: 'uuid' },
          fromWalletId: { type: 'string', format: 'uuid' },
          toWalletId: { type: 'string', format: 'uuid' },
          amount: { type: 'integer', example: 12000 },
          idempotencyKey: { type: 'string' },
          failureCode: { type: 'string', nullable: true },
          failureReason: { type: 'string', nullable: true },
          verificationCode: {
            type: 'string',
            nullable: true,
            example: '482915',
            description: 'رمز التحقق السداسي (يظهر فقط لعمليات الدفع المكتملة)',
          },
          balanceAfter: {
            type: 'object',
            properties: {
              from: { type: 'integer', nullable: true, example: 8000 },
              to: { type: 'integer', nullable: true, example: 12000 },
            },
          },
          fromBalanceAfter: { type: 'integer', nullable: true, example: 8000 },
          toBalanceAfter: { type: 'integer', nullable: true, example: 12000 },
          createdAt: { type: 'string', format: 'date-time' },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      TransactionHistoryItemDto: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          reference: { type: 'string', example: 'FW-20261114-000042' },
          type: { type: 'string', enum: ['TOPUP', 'TRANSFER', 'PAYMENT'] },
          status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'FAILED'] },
          amount: { type: 'integer', example: 12000 },
          from: {
            type: 'object',
            properties: {
              walletId: { type: 'string', format: 'uuid' },
              type: {
                type: 'string',
                enum: ['BANK_SIM', 'USER_MAIN', 'USER_STATION', 'STATION_REVENUE'],
              },
              stationId: { type: 'string', format: 'uuid', nullable: true },
              stationName: { type: 'string', nullable: true },
            },
          },
          to: {
            type: 'object',
            properties: {
              walletId: { type: 'string', format: 'uuid' },
              type: {
                type: 'string',
                enum: ['BANK_SIM', 'USER_MAIN', 'USER_STATION', 'STATION_REVENUE'],
              },
              stationId: { type: 'string', format: 'uuid', nullable: true },
              stationName: { type: 'string', nullable: true },
            },
          },
          failureCode: { type: 'string', nullable: true },
          failureMessage: {
            type: 'string',
            nullable: true,
            example: 'الرصيد غير كافٍ لإتمام العملية',
          },
          verificationCode: { type: 'string', nullable: true, example: '482915' },
          createdAt: { type: 'string', format: 'date-time' },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      WalletLedgerEntryDto: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          transactionId: { type: 'string', format: 'uuid' },
          reference: { type: 'string', example: 'FW-20261114-000042' },
          transactionReference: { type: 'string', example: 'FW-20261114-000042' },
          type: { type: 'string', enum: ['TOPUP', 'TRANSFER', 'PAYMENT'] },
          delta: { type: 'integer', example: -12000 },
          balanceAfter: { type: 'integer', example: 8000 },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      OperatorSummaryDto: {
        type: 'object',
        properties: {
          stationId: { type: 'string', format: 'uuid' },
          stationName: { type: 'string', example: 'محطة النيل' },
          congestion: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
          isActive: { type: 'boolean', example: true },
          totalAmount: { type: 'integer', example: 45000 },
          todayTotalAmount: { type: 'integer', example: 45000 },
          paymentCount: { type: 'integer', example: 4 },
          todayPaymentCount: { type: 'integer', example: 4 },
          revenueBalance: { type: 'integer', example: 120000 },
          date: { type: 'string', example: '2026-11-14' },
        },
      },
      OperatorPaymentDto: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          reference: { type: 'string', example: 'FW-20261114-000042' },
          stationId: { type: 'string', format: 'uuid' },
          amount: { type: 'integer', example: 12000 },
          verificationCode: { type: 'string', nullable: true, example: '482915' },
          payerName: { type: 'string', example: 'أ*** محمد' },
          maskedPayerName: { type: 'string', example: 'أ*** محمد' },
          createdAt: { type: 'string', format: 'date-time' },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      ReconciliationReportDto: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', example: true },
          checkedAt: { type: 'string', format: 'date-time' },
          issues: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                kind: {
                  type: 'string',
                  enum: [
                    'WALLET_BALANCE_MISMATCH',
                    'TXN_LEDGER_IMBALANCE',
                    'NON_COMPLETED_TXN_HAS_LEDGER',
                    'SYSTEM_BALANCE_SUM_NON_ZERO',
                  ],
                },
                entityId: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
  security: [{ BearerAuth: [] }],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'فحص حالة الخادم وقاعدة البيانات — Health Check',
        security: [],
        responses: {
          '200': {
            description: 'Server and PostgreSQL database are healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    database: { type: 'string', example: 'up' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/me': {
      get: {
        tags: ['User & Wallets (/api/me, /api/wallets)'],
        summary:
          'جلب ملف المستخدم والمحفظة الرئيسية ومحافظ المحطات — Get Current User & Wallets',
        description:
          'يقوم تلقائياً بإنشاء المستخدم ومحفظته الرئيسية (`USER_MAIN`) عند أول طلب إذا لم يكن مسجلاً في قاعدة البيانات، ويعيد رقم المحفظة المختصر المكون من 6 أرقام.',
        responses: {
          '200': {
            description: 'Current user profile and wallet balances',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/MeResponse' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorEnvelope' },
              },
            },
          },
        },
      },
    },
    '/api/stations': {
      get: {
        tags: ['Stations (/api/stations)'],
        summary: 'قائمة محطات الوقود مع الرصيد المتاح — List Fuel Stations',
        parameters: [
          {
            name: 'city',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'تصفية المحطات حسب المدينة (مثال: الخرطوم)',
          },
        ],
        responses: {
          '200': {
            description: 'List of stations with caller wallet balances',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/StationDto' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Stations (/api/stations)'],
        summary: 'إنشاء محطة وقود جديدة — Create Fuel Station',
        description:
          'ينشئ محطة وقود جديدة مع محفظة الإيرادات الخاصة بها (`STATION_REVENUE`) داخل معاملة قاعدة بيانات واحدة.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateStationInput' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Station created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/StationDto' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/stations/{id}': {
      get: {
        tags: ['Stations (/api/stations)'],
        summary: 'تفاصيل محطة وقود محددة — Get Station by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Station details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/StationDto' },
                  },
                },
              },
            },
          },
          '404': { description: 'Station not found' },
        },
      },
      patch: {
        tags: ['Stations (/api/stations)'],
        summary: 'تعديل بيانات محطة وقود — Update Station',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateStationInput' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated station',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/StationDto' },
                  },
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Stations (/api/stations)'],
        summary: 'حذف محطة وقود — Delete Station',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Station deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        deleted: { type: 'boolean', example: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/topups': {
      post: {
        tags: ['Money Operations (/api/topups, /api/transfers, /api/payments)'],
        summary: 'تغذية المحفظة الرئيسية من البنك — Top Up Main Wallet',
        description:
          'يشحن محفظة المستخدم الرئيسية (`USER_MAIN`) من محفظة محاكي البنك (`BANK_SIM`). يتطلب ترويسة `Idempotency-Key`. إذا كانت بوابة البنك متوقفة (`DOWN`) تعيد `503 BANK_UNAVAILABLE` وتُسجل العملية بحالة `FAILED` بدون أي قيود محاسبية.',
        parameters: [
          { $ref: '#/components/parameters/IdempotencyKeyHeader' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount'],
                properties: {
                  amount: {
                    type: 'integer',
                    minimum: 100,
                    maximum: 1000000,
                    example: 30000,
                    description: 'المبلغ بالجنيه السوداني (عدد صحيح موجب)',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Top-up completed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/TransactionDto' },
                  },
                },
              },
            },
          },
          '422': { description: 'Amount out of range or account frozen' },
          '503': { description: 'Bank gateway is DOWN (BANK_UNAVAILABLE)' },
        },
      },
    },
    '/api/transfers': {
      post: {
        tags: ['Money Operations (/api/topups, /api/transfers, /api/payments)'],
        summary: 'تحويل الرصيد بين المحفظة الرئيسية ومحافظ المحطات — Transfer Balance',
        description:
          'يتيح التحويل الفوري بين المحفظة الرئيسية (`USER_MAIN`) ومحافظ المحطات (`USER_STATION`) أو من محطة إلى أخرى مباشرةً دون المرور بالبنك.',
        parameters: [
          { $ref: '#/components/parameters/IdempotencyKeyHeader' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fromWalletId', 'to', 'amount'],
                properties: {
                  fromWalletId: {
                    type: 'string',
                    format: 'uuid',
                    description: 'معرف المحفظة المصدر المملوكة للمستخدم',
                  },
                  to: {
                    type: 'object',
                    required: ['type'],
                    properties: {
                      type: {
                        type: 'string',
                        enum: ['MAIN', 'STATION'],
                        example: 'STATION',
                      },
                      stationId: {
                        type: 'string',
                        format: 'uuid',
                        description: 'مطلوب عندما يكون النوع STATION',
                      },
                    },
                  },
                  amount: {
                    type: 'integer',
                    minimum: 1,
                    example: 20000,
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Transfer completed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/TransactionDto' },
                  },
                },
              },
            },
          },
          '422': {
            description:
              'INSUFFICIENT_FUNDS, SAME_WALLET, STATION_INACTIVE, or ACCOUNT_FROZEN',
          },
        },
      },
    },
    '/api/payments': {
      post: {
        tags: ['Money Operations (/api/topups, /api/transfers, /api/payments)'],
        summary: 'دفع قيمة الوقود في محطة — Pay at Fuel Station',
        description:
          'يخصم المبلغ من محفظة المحطة المخصصة (`USER_STATION`) أو المحفظة الرئيسية (`USER_MAIN`) ويودعه في محفظة إيرادات المحطة (`STATION_REVENUE`) مع إصدار رمز تحقق سداسي عشوائي (`verificationCode`) لعرضه لمشغل المحطة.',
        parameters: [
          { $ref: '#/components/parameters/IdempotencyKeyHeader' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['stationId', 'sourceWalletId', 'amount'],
                properties: {
                  stationId: { type: 'string', format: 'uuid' },
                  sourceWalletId: { type: 'string', format: 'uuid' },
                  amount: { type: 'integer', minimum: 1, example: 12000 },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Payment completed with 6-digit verificationCode',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/TransactionDto' },
                  },
                },
              },
            },
          },
          '422': {
            description:
              'INSUFFICIENT_FUNDS, WRONG_STATION_BALANCE, STATION_INACTIVE, or ACCOUNT_FROZEN',
          },
        },
      },
    },
    '/api/transactions': {
      get: {
        tags: ['Transactions History (/api/transactions)'],
        summary: 'سجل المعاملات المالية للمستخدم — List User Transactions',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
          {
            name: 'cursor',
            in: 'query',
            schema: { type: 'string' },
            description: 'Opaque base64 pagination cursor',
          },
          {
            name: 'type',
            in: 'query',
            schema: { type: 'string', enum: ['TOPUP', 'TRANSFER', 'PAYMENT'] },
          },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['PENDING', 'COMPLETED', 'FAILED'] },
          },
        ],
        responses: {
          '200': {
            description: 'Cursor-paginated transaction history',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        items: {
                          type: 'array',
                          items: {
                            $ref: '#/components/schemas/TransactionHistoryItemDto',
                          },
                        },
                        nextCursor: { type: 'string', nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/transactions/{id}': {
      get: {
        tags: ['Transactions History (/api/transactions)'],
        summary: 'تفاصيل معاملة مالية محددة — Get Single Transaction Detail',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Transaction detail',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      $ref: '#/components/schemas/TransactionHistoryItemDto',
                    },
                  },
                },
              },
            },
          },
          '404': { description: 'Transaction not found or not owned by caller' },
        },
      },
    },
    '/api/wallets/{id}/ledger': {
      get: {
        tags: ['User & Wallets (/api/me, /api/wallets)'],
        summary: 'كشف حساب المحفظة (قيود الدفتر المحاسبي) — Wallet Ledger Statement',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
          {
            name: 'cursor',
            in: 'query',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Append-only double-entry ledger entries for this wallet',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        items: {
                          type: 'array',
                          items: {
                            $ref: '#/components/schemas/WalletLedgerEntryDto',
                          },
                        },
                        nextCursor: { type: 'string', nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/operator/summary': {
      get: {
        tags: ['Operator Tools (/api/operator)'],
        summary: 'ملخص إيرادات المحطة اليومية للمشغل — Operator Daily Summary',
        parameters: [
          {
            name: 'stationId',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'uuid' },
            description: 'Optional stationId override for ADMIN callers',
          },
        ],
        responses: {
          '200': {
            description: 'Daily station revenue summary',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/OperatorSummaryDto' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/operator/payments': {
      get: {
        tags: ['Operator Tools (/api/operator)'],
        summary: 'سجل المدفوعات الواردة للمحطة — List Incoming Station Payments',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 20 },
          },
          {
            name: 'cursor',
            in: 'query',
            schema: { type: 'string' },
          },
          {
            name: 'stationId',
            in: 'query',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Paginated station incoming payments',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        items: {
                          type: 'array',
                          items: {
                            $ref: '#/components/schemas/OperatorPaymentDto',
                          },
                        },
                        nextCursor: { type: 'string', nullable: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/operator/payments/lookup': {
      get: {
        tags: ['Operator Tools (/api/operator)'],
        summary:
          'التحقق من الرمز السداسي لعملية دفع خلال آخر 30 دقيقة — Lookup 6-Digit Verification Code',
        parameters: [
          {
            name: 'code',
            in: 'query',
            required: true,
            schema: { type: 'string', pattern: '^\\d{6}$', example: '482915' },
          },
          {
            name: 'stationId',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Matching payment verified within last 30 minutes',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/OperatorPaymentDto' },
                  },
                },
              },
            },
          },
          '404': { description: 'Code not found or expired (>30 minutes)' },
        },
      },
    },
    '/api/operator/station': {
      patch: {
        tags: ['Operator Tools (/api/operator)'],
        summary: 'تحديث مستوى الازدحام في المحطة — Update Station Congestion',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['congestion'],
                properties: {
                  congestion: {
                    type: 'string',
                    enum: ['LOW', 'MEDIUM', 'HIGH'],
                    example: 'MEDIUM',
                  },
                  stationId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated station congestion',
          },
        },
      },
    },
    '/api/operator/assign-station': {
      patch: {
        tags: ['Operator Tools (/api/operator)'],
        summary: 'تعيين أو تغيير المحطة المسندة للمشغل — Switch Operator Assigned Station',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['stationId'],
                properties: {
                  stationId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Operator assigned station updated',
          },
        },
      },
    },
    '/api/admin/bank-status': {
      get: {
        tags: ['Admin Tools (/api/admin)'],
        summary: 'قراءة حالة بوابة البنك المحاكية (UP / DOWN) — Get Bank Gateway Status',
        responses: {
          '200': {
            description: 'Current simulated bank gateway status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', enum: ['UP', 'DOWN'] },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Admin Tools (/api/admin)'],
        summary: 'تبديل حالة بوابة البنك المحاكية (UP / DOWN) — Set Bank Gateway Status',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: {
                    type: 'string',
                    enum: ['UP', 'DOWN'],
                    example: 'DOWN',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated bank gateway status',
          },
        },
      },
    },
    '/api/admin/reconcile': {
      get: {
        tags: ['Admin Tools (/api/admin)'],
        summary:
          'فحص ومطابقة سلامة دفتر الأستاذ العام (القيد المزدوج) — Run Double-Entry Ledger Reconciliation',
        description:
          'يتحقق من 4 ثوابت محاسبية صارمة:\n' +
          '1. رصيد كل محفظة يساوي مجموع قيودها في `ledger_entries`.\n' +
          '2. كل معاملة مكتملة لها قيدان مجموعهما `0`.\n' +
          '3. المعاملات الفاشلة أو المعلقة ليس لها أي قيود محاسبية.\n' +
          '4. مجموع أرصدة جميع المحافظ في النظام يساوي `0`.',
        responses: {
          '200': {
            description: 'Reconciliation report',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      $ref: '#/components/schemas/ReconciliationReportDto',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/admin/stations': {
      post: {
        tags: ['Admin Tools (/api/admin)'],
        summary: 'إنشاء محطة وقود جديدة (مدير النظام) — Admin Create Station',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateStationInput' },
            },
          },
        },
        responses: {
          '201': { description: 'Station created' },
        },
      },
    },
    '/api/admin/stations/{id}': {
      patch: {
        tags: ['Admin Tools (/api/admin)'],
        summary: 'تفعيل/تعطيل أو تعديل محطة وقود — Admin Update Station',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateStationInput' },
            },
          },
        },
        responses: {
          '200': { description: 'Station updated' },
        },
      },
      delete: {
        tags: ['Admin Tools (/api/admin)'],
        summary: 'حذف محطة وقود (مدير النظام) — Admin Delete Station',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'Station deleted' },
        },
      },
    },
    '/api/admin/users/{id}': {
      patch: {
        tags: ['Admin Tools (/api/admin)'],
        summary: 'تجميد أو تنشيط حساب مستخدم (ACTIVE / FROZEN) — Freeze or Activate User',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: {
                    type: 'string',
                    enum: ['ACTIVE', 'FROZEN'],
                    example: 'FROZEN',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'User status updated' },
        },
      },
    },
  },
} as const;

