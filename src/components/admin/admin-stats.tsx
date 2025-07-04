// @ts-ignore
import React from 'react';
import { UserWithStats } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AdminStatsProps {
  users: UserWithStats[];
}

export function AdminStats({ users }: AdminStatsProps) {
  const totalUsers = users.length;
  const approvedUsers = users.filter((user: UserWithStats) => user.approved).length;
  const pendingUsers = totalUsers - approvedUsers;
  const totalVoiceEvents = users.reduce((sum: number, user: UserWithStats) => 
    sum + (user.voice_events_count || 0), 0
  );

  const stats = [
    {
      title: "Total Users",
      value: totalUsers,
      description: "Registered users",
    },
    {
      title: "Approved Users", 
      value: approvedUsers,
      description: "Can send voice notes",
    },
    {
      title: "Pending Approval",
      value: pendingUsers,
      description: "Awaiting approval",
    },
    {
      title: "Voice Events",
      value: totalVoiceEvents,
      description: "Total processed",
    },
  ];

  return (
    // @ts-ignore
    <>
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle>
              {/* @ts-ignore */}
              <div className="text-sm font-medium">
                {stat.title}
              {/* @ts-ignore */}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* @ts-ignore */}
            <div className="text-2xl font-bold">
              {stat.value}
            {/* @ts-ignore */}
            </div>
            {/* @ts-ignore */}
            <p className="text-xs text-muted-foreground">
              {stat.description}
            {/* @ts-ignore */}
            </p>
          </CardContent>
        </Card>
      ))}
    {/* @ts-ignore */}
    </>
  );
} 