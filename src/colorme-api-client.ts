// カラーミーショップAPIクライアント

export interface ColorMeApiError {
  code: number;
  message: string;
  status: number;
}

export interface ColorMeApiErrorResponse {
  errors: ColorMeApiError[];
}

export class ColorMeApiClient {
  private baseUrl = 'https://api.shop-pro.jp/v1';
  
  constructor(private accessToken: string) {}

  // APIリクエストの共通処理
  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json() as ColorMeApiErrorResponse;
      const error = errorData.errors?.[0];
      throw new Error(
        error ? `${error.message} (コード: ${error.code})` : `APIエラー: ${response.status}`
      );
    }

    return response.json();
  }

  // GET リクエスト
  async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return this.request<T>(url.pathname + url.search);
  }

  // POST リクエスト
  async post<T>(path: string, data?: any): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT リクエスト
  async put<T>(path: string, data?: any): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE リクエスト
  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, {
      method: 'DELETE',
    });
  }
}

// API レスポンスの型定義

// ショップ情報
export interface Shop {
  id: string;
  state: 'enabled' | 'suspended' | 'unsigned';
  domain_plan: 'cmsp_sub_domain' | 'own_domain' | 'own_sub_domain';
  contract_plan: string;
  contract_start_date: number;
  contract_end_date: number;
  contract_term: number | null;
  last_login_date: number;
  setup_date: number;
  make_date: number;
  url: string;
  open_state: 'opened' | 'closed' | 'prepare' | 'paused';
  mobile_open_state: 'opened' | 'closed' | 'prepare' | 'paused';
  name: string;
  introduction: string | null;
  postal: string;
  prefecture_id: number;
  address: string;
  mail: string;
  tel: string;
  tel2: string | null;
  fax: string | null;
  business_time: string | null;
  minimum_order_quantity: number | null;
  law: boolean;
}

// 商品情報
export interface Product {
  id: number;
  account_id: string;
  name: string;
  price: number;
  sale_price: number | null;
  members_price: number | null;
  cost: number | null;
  weight: number;
  taxable: boolean;
  stock_managed: boolean;
  stock_quantity: number | null;
  few_num: number | null;
  model_number: string | null;
  simple_explain: string | null;
  explain: string | null;
  published: boolean;
  sort: number;
  make_date: number;
  update_date: number;
  sales_period_from: number | null;
  sales_period_to: number | null;
  unit: string | null;
  max_quantity: number | null;
  group_ids: number[];
  images: ProductImage[];
  options: ProductOption[];
  variants: ProductVariant[];
}

export interface ProductImage {
  src: string;
  position: number;
  created_at: number;
  updated_at: number;
}

export interface ProductOption {
  id: number;
  name: string;
  position: number;
  values: string[];
}

export interface ProductVariant {
  id: number;
  product_id: number;
  price: number | null;
  stock_quantity: number | null;
  option_values: string[];
}

// 在庫情報
export interface Stock {
  product_id: number;
  variant_id: number | null;
  stock_quantity: number;
}

// 受注情報
export interface Sale {
  id: number;
  account_id: string;
  customer_id: number | null;
  sale_delivery_id: number;
  accepted_status: string;
  accepted_mail_state: string;
  paid_status: string;
  paid_mail_state: string;
  delivered_status: string;
  delivered_mail_state: string;
  cancelled: boolean;
  total_price: number;
  product_total_price: number;
  delivery_total_charge: number;
  fee: number;
  tax: number;
  discount: number;
  granted_points: number;
  used_points: number;
  accepted_date: number;
  accepted_date_to_pay: number | null;
  paid_date: number | null;
  delivered_date: number | null;
  cancelled_date: number | null;
  memo: string | null;
  customer_memo: string | null;
  details: SaleDetail[];
  delivery: SaleDelivery;
}

export interface SaleDetail {
  id: number;
  sale_id: number;
  product_id: number;
  product_name: string;
  product_model_number: string | null;
  product_price: number;
  product_num: number;
  product_cost: number | null;
  option_price: number;
  option_discount: number;
  subtotal_price: number;
}

export interface SaleDelivery {
  id: number;
  sale_id: number;
  name: string;
  postal: string;
  prefecture_id: number;
  address: string;
  tel: string;
  delivery_method: string;
  delivery_date: string | null;
  delivery_time: string | null;
}

// 顧客情報
export interface Customer {
  id: number;
  account_id: string;
  name: string;
  furigana: string | null;
  email: string;
  postal: string;
  prefecture_id: number;
  address: string;
  tel: string;
  tel2: string | null;
  points: number;
  member: boolean;
  mail_magazine: boolean;
  created_at: number;
  updated_at: number;
}

// ショップクーポン
export interface ShopCoupon {
  id: number;
  name: string;
  discount_type: 'price' | 'rate';
  discount_value: number;
  enabled: boolean;
  usage_limit: number | null;
  usage_count: number;
  start_date: number | null;
  end_date: number | null;
  created_at: number;
  updated_at: number;
}

// 売上統計
export interface SalesStat {
  date: string;
  sales_count: number;
  sales_amount: number;
  sales_amount_without_tax: number;
  discount_amount: number;
  returned_count: number;
  returned_amount: number;
}

// カテゴリー
export interface Category {
  id: number;
  parent_id: number | null;
  name: string;
  position: number;
  visible: boolean;
  created_at: number;
  updated_at: number;
}

// グループ
export interface Group {
  id: number;
  name: string;
  position: number;
  created_at: number;
  updated_at: number;
}

// 配送方法
export interface Delivery {
  id: number;
  name: string;
  charge_type: string;
  charge_value: number;
  cod_flag: boolean;
  time_specify_flag: boolean;
  memo: string | null;
  preferred_date_flag: boolean;
  preferred_period_flag: boolean;
  slip_number_flag: boolean;
  sort_number: number;
  visible: boolean;
}

// 決済方法
export interface Payment {
  id: number;
  name: string;
  fee_type: string;
  fee_value: number;
  position: number;
  visible: boolean;
}

// ギフト設定
export interface Gift {
  noshi: boolean;
  noshi_text: boolean;
  gift_wrapping: boolean;
}