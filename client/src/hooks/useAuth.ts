import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/auth.store';
import * as authApi from '../api/auth.api';
import { extractErrorMessage } from '../shared/api/client';
import type { LoginCredentials, SignupData, OrganizerSignupData } from '../types/auth.types';

export function useLogin(role: 'fan' | 'organizer') {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) =>
      role === 'fan' ? authApi.loginUser(credentials) : authApi.loginOrganizer(credentials),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate('/');
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useSignup(role: 'fan' | 'organizer') {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: SignupData | OrganizerSignupData) =>
      role === 'fan' ? authApi.signupUser(data as SignupData) : authApi.signupOrganizer(data as OrganizerSignupData),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      toast.success('Account created successfully!');
      navigate('/');
    },
    onError: (error: unknown) => {
      toast.error(extractErrorMessage(error));
    },
  });
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () => authApi.logoutUser(),
    onSettled: () => {
      clearAuth();
      queryClient.clear();
      navigate('/');
      toast.success('Logged out');
    },
  });
}
