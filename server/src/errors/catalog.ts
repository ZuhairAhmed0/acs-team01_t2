export interface ErrorDefinition {
  httpStatus: number;
  message: string;
}

export const ERROR_CATALOG = {
  UNAUTHENTICATED: {
    httpStatus: 401,
    message: 'يرجى تسجيل الدخول للمتابعة',
  },
  FORBIDDEN: {
    httpStatus: 403,
    message: 'ليس لديك صلاحية للوصول إلى هذا المورد',
  },
  NOT_FOUND: {
    httpStatus: 404,
    message: 'المورد المطلوب غير موجود',
  },
  VALIDATION_ERROR: {
    httpStatus: 400,
    message: 'البيانات المدخلة غير صالحة',
  },
  INVALID_AMOUNT: {
    httpStatus: 400,
    message: 'المبلغ المدخل غير صالح',
  },
  AMOUNT_OUT_OF_RANGE: {
    httpStatus: 400,
    message: 'المبلغ خارج النطاق المسموح به',
  },
  SAME_WALLET: {
    httpStatus: 400,
    message: 'لا يمكن التحويل إلى نفس المحفظة',
  },
  IDEMPOTENCY_KEY_REQUIRED: {
    httpStatus: 400,
    message: 'مفتاح عدم التكرار (Idempotency-Key) مطلوب وصالح',
  },
  INSUFFICIENT_FUNDS: {
    httpStatus: 422,
    message: 'الرصيد غير كافٍ لإتمام العملية',
  },
  WRONG_STATION_BALANCE: {
    httpStatus: 422,
    message: 'الرصيد مخصص لمحطة أخرى',
  },
  STATION_INACTIVE: {
    httpStatus: 422,
    message: 'المحطة غير نشطة حالياً',
  },
  IDEMPOTENCY_KEY_REUSED: {
    httpStatus: 422,
    message: 'تم استخدام مفتاح عدم التكرار مسبقاً مع بيانات مختلفة',
  },
  ACCOUNT_FROZEN: {
    httpStatus: 403,
    message: 'الحساب مجمد حالياً، لا يمكن إجراء هذه العملية',
  },
  IN_PROGRESS: {
    httpStatus: 409,
    message: 'العملية قيد التنفيذ حالياً',
  },
  TXN_NOT_PENDING: {
    httpStatus: 409,
    message: 'العملية ليست في حالة انتظار',
  },
  TOO_MANY_REQUESTS: {
    httpStatus: 429,
    message: 'تم تجاوز الحد المسموح به من الطلبات، يرجى المحاولة لاحقاً',
  },
  BANK_UNAVAILABLE: {
    httpStatus: 503,
    message: 'خدمة البنك غير متاحة حالياً، يرجى المحاولة لاحقاً',
  },
  TIMEOUT: {
    httpStatus: 500,
    message: 'انتهت مهلة العملية',
  },
  INTERNAL: {
    httpStatus: 500,
    message: 'حدث خطأ داخلي في الخادم',
  },
  NOT_IMPLEMENTED: {
    httpStatus: 501,
    message: 'هذه الميزة غير مفعلة بعد',
  },
} as const satisfies Record<string, ErrorDefinition>;

export type ErrorCode = keyof typeof ERROR_CATALOG;

