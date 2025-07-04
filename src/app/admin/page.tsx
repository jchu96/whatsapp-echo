// @ts-ignore
import { getServerSession } from 'next-auth';
import { authOptions, isSessionAdmin } from '@/lib/auth';
import { getUsersWithStats } from '@/lib/database';
// @ts-ignore
import { redirect } from 'next/navigation';
// @ts-ignore
import { UsersTable } from '@/components/admin/users-table';
// @ts-ignore
import { AdminStats } from '@/components/admin/admin-stats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !isSessionAdmin(session)) {
    redirect('/');
  }

  // Fetch initial data
  const usersResult = await getUsersWithStats(1, 20);
  const users = usersResult.success ? usersResult.data : [];

  return (
    // @ts-ignore
    <div className="container mx-auto py-8">
      {/* @ts-ignore */}
      <div className="mb-8">
        {/* @ts-ignore */}
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        {/* @ts-ignore */}
        <p className="text-muted-foreground">
          Manage users and monitor voice note processing performance
        {/* @ts-ignore */}
        </p>
      {/* @ts-ignore */}
      </div>

      {/* Statistics Cards */}
      {/* @ts-ignore */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <AdminStats users={users} />
      {/* @ts-ignore */}
      </div>

      {/* Users Management Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UsersTable initialUsers={users} />
        </CardContent>
      </Card>
    {/* @ts-ignore */}
    </div>
  );
} 