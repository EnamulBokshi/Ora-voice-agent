"use server";

import {
  loginApi,
  registerApi,
  verifyOtpApi,
  resendOtpApi,
  logoutApi,
  getMeApi,
} from '@/services/auth-service';
import { ApiClientError } from '@/lib/api-client';

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export async function loginAction(
  formData: FormData,
): Promise<ActionResult<any>> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required.',
      },
    };
  }

  try {
    const data = await loginApi({ email, password });
    return { success: true, data };
  } catch (err) {
    if (err instanceof ApiClientError) {
      return {
        success: false,
        error: { code: err.code, message: err.message },
      };
    }
    return {
      success: false,
      error: {
        code: 'LOGIN_FAILED',
        message: 'Failed to authenticate. Please check your credentials.',
      },
    };
  }
}

export async function registerAction(
  formData: FormData,
): Promise<ActionResult<any>> {
  const businessName = formData.get('businessName') as string;
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const domain = (formData.get('domain') as string) || undefined;

  if (!businessName || !name || !email || !password) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Business name, owner name, email, and password are required.',
      },
    };
  }

  try {
    const data = await registerApi({
      businessName,
      name,
      email,
      password,
      domain,
    });
    return { success: true, data };
  } catch (err) {
    if (err instanceof ApiClientError) {
      return {
        success: false,
        error: { code: err.code, message: err.message },
      };
    }
    return {
      success: false,
      error: {
        code: 'REGISTER_FAILED',
        message: 'Failed to create merchant account. Please try again.',
      },
    };
  }
}

export async function verifyOtpAction(
  code: string,
  accessToken?: string,
): Promise<ActionResult<any>> {
  if (!code || code.length !== 6) {
    return {
      success: false,
      error: {
        code: 'INVALID_CODE',
        message: 'Verification code must be exactly 6 digits.',
      },
    };
  }

  try {
    const data = await verifyOtpApi(code, accessToken);
    return { success: true, data };
  } catch (err) {
    if (err instanceof ApiClientError) {
      return {
        success: false,
        error: { code: err.code, message: err.message },
      };
    }
    return {
      success: false,
      error: {
        code: 'VERIFY_FAILED',
        message: 'OTP verification failed.',
      },
    };
  }
}

export async function resendOtpAction(
  accessToken?: string,
): Promise<ActionResult<any>> {
  try {
    const data = await resendOtpApi(accessToken);
    return { success: true, data };
  } catch (err) {
    if (err instanceof ApiClientError) {
      return {
        success: false,
        error: { code: err.code, message: err.message },
      };
    }
    return {
      success: false,
      error: {
        code: 'RESEND_FAILED',
        message: 'Failed to resend verification code.',
      },
    };
  }
}

export async function logoutAction(): Promise<ActionResult<any>> {
  try {
    const data = await logoutApi();
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'LOGOUT_FAILED',
        message: 'Failed to log out.',
      },
    };
  }
}

export async function getMeAction(
  accessToken?: string,
): Promise<ActionResult<any>> {
  try {
    const data = await getMeApi(accessToken);
    return { success: true, data };
  } catch (err) {
    if (err instanceof ApiClientError) {
      return {
        success: false,
        error: { code: err.code, message: err.message },
      };
    }
    return {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Failed to retrieve profile.',
      },
    };
  }
}
