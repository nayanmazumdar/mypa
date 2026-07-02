import { useSelector } from 'react-redux';

export default function Settings() {
  const { user } = useSelector((state) => state.auth);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your account settings</p>
      </div>

      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Profile Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
            <p className="text-gray-900">{user?.name || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
            <p className="text-gray-900">{user?.email || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Role</label>
            <p className="text-gray-900 capitalize">{user?.role || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Shop Name</label>
            <p className="text-gray-900">{user?.shop_name || '-'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
