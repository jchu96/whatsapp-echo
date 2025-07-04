'use client';

import React, { useState } from 'react';
import { UserWithStats } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { formatDate } from '@/lib/utils';

interface UsersTableProps {
  initialUsers: UserWithStats[];
}

export function UsersTable({ initialUsers }: UsersTableProps) {
  const [users, setUsers] = useState<UserWithStats[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  const filteredUsers = users.filter((user: UserWithStats) =>
    user.google_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleUserApproval = async (userId: string) => {
    setLoading(userId);
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'toggle_approval',
          userId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update user in local state
        setUsers(prev => prev.map(user => 
          user.id === userId 
            ? { ...user, approved: result.user.approved }
            : user
        ));
      } else {
        console.error('Failed to toggle user approval');
      }
    } catch (error) {
      console.error('Error toggling user approval:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <div className="text-sm text-muted-foreground">
          {filteredUsers.length} of {users.length} users
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              Email
            </TableHead>
            <TableHead>
              Slug
            </TableHead>
            <TableHead>
              Status
            </TableHead>
            <TableHead>
              Voice Events
            </TableHead>
            <TableHead>
              Last Activity
            </TableHead>
            <TableHead>
              Created
            </TableHead>
            <TableHead>
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="font-medium">
                  {user.google_email}
                </div>
              </TableCell>
              <TableCell>
                <code className="text-sm bg-muted px-2 py-1 rounded">
                  {user.slug}
                </code>
              </TableCell>
              <TableCell>
                <Badge variant={Boolean(user.approved) ? "success" : "secondary"}>
                  {Boolean(user.approved) ? "Approved" : "Pending"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-center">
                  {user.voice_events_count || 0}
                </div>
              </TableCell>
              <TableCell>
                {user.last_activity ? formatDate(user.last_activity) : "Never"}
              </TableCell>
              <TableCell>
                {formatDate(user.created_at)}
              </TableCell>
              <TableCell>
                <Button
                  variant={Boolean(user.approved) ? "destructive" : "default"}
                  size="sm"
                  onClick={() => toggleUserApproval(user.id)}
                  disabled={loading === user.id}
                >
                  {loading === user.id
                    ? "Loading..."
                    : Boolean(user.approved)
                    ? "Revoke"
                    : "Approve"
                  }
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {filteredUsers.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {searchTerm ? "No users found matching your search." : "No users found."}
        </div>
      )}
    </div>
  );
} 