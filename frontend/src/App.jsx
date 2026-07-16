import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import AppRouter from './router';
import { loadUser } from './store/authSlice';
import AppErrorBoundary from './components/common/AppErrorBoundary';

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(loadUser());
  }, [dispatch]);

  return (
    <AppErrorBoundary>
      <AppRouter />
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
    </AppErrorBoundary>
  );
}

export default App;
