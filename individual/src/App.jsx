import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { loadUser } from './store/authSlice';
import AppRouter from './router';

export default function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(loadUser());
  }, [dispatch]);

  return <AppRouter />;
}
