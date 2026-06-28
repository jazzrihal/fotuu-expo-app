import { AppState, type AppStateStatus } from 'react-native';
import { focusManager } from '@tanstack/react-query';

focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
    handleFocus(status === 'active');
  });

  return () => subscription.remove();
});
