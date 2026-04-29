import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Users, Layers, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { he, es, ar, de, enUS } from 'date-fns/locale';

const AdminDashboard = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'he' || i18n.language === 'ar';

  // Get date-fns locale based on current language
  const getDateLocale = () => {
    switch (i18n.language) {
      case 'he': return he;
      case 'es': return es;
      case 'ar': return ar;
      case 'de': return de;
      default: return enUS;
    }
  };

  // Fetch meta organizations count
  const { data: metaOrgsData, isLoading: metaOrgsLoading } = useQuery({
    queryKey: ['admin-meta-orgs-count'],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('meta_organizations')
        .select('*', { count: 'exact' });
      
      if (error) throw error;
      
      const activeCount = data?.filter(org => org.is_active).length || 0;
      return { total: count || 0, active: activeCount, orgs: data || [] };
    }
  });

  // Fetch sub-organizations count
  const { data: orgsData, isLoading: orgsLoading } = useQuery({
    queryKey: ['admin-orgs-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    }
  });

  // Fetch users count (from profiles as we can't query auth.users directly)
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    }
  });

  // Fetch recent meta organizations
  const { data: recentMetaOrgs, isLoading: recentOrgsLoading } = useQuery({
    queryKey: ['admin-recent-meta-orgs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_organizations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch recent user memberships for activity
  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['admin-recent-activity'],
    queryFn: async () => {
      // Fetch recent meta org memberships with user profile info
      const { data: memberships, error } = await supabase
        .from('meta_organization_memberships')
        .select(`
          id,
          created_at,
          role,
          meta_organization:meta_organizations(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return memberships || [];
    }
  });

  const isLoading = metaOrgsLoading || orgsLoading || usersLoading;

  const stats = [
    { 
      title: t('admin.dashboard.totalOrgs'), 
      value: metaOrgsLoading ? null : (metaOrgsData?.total || 0).toString(), 
      icon: Building2, 
      subtitle: t('admin.dashboard.activeOrgs'),
      subvalue: metaOrgsLoading ? null : `${metaOrgsData?.active || 0} ${t('common.active').toLowerCase()}`
    },
    { 
      title: t('admin.organizations'),
      value: orgsLoading ? null : (orgsData || 0).toString(), 
      icon: Layers, 
      subtitle: isRtl ? 'תתי-ארגונים' : 'Sub-organizations',
      subvalue: isRtl ? 'בכל המטא-ארגונים' : 'Across all meta orgs'
    },
    { 
      title: t('admin.dashboard.totalUsers'), 
      value: usersLoading ? null : (usersData || 0).toString(), 
      icon: Users, 
      subtitle: isRtl ? 'משתמשים רשומים' : 'Registered users',
      subvalue: isRtl ? 'בכל המערכת' : 'System-wide'
    },
    { 
      title: isRtl ? 'שיעור צמיחה' : 'Growth Rate', 
      value: '--', 
      icon: TrendingUp, 
      subtitle: isRtl ? 'בהשוואה לחודש שעבר' : 'Compared to last month',
      subvalue: isRtl ? 'בקרוב' : 'Coming soon'
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('admin.dashboard.title')}</h1>
          <p className="text-muted-foreground">{t('admin.dashboard.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="w-5 h-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {stat.value === null ? (
                  <Skeleton className="h-9 w-20" />
                ) : (
                  <div className="text-3xl font-bold">{stat.value}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">{stat.subvalue}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{isRtl ? 'מטא-ארגונים אחרונים' : 'Recent Meta Organizations'}</CardTitle>
            </CardHeader>
            <CardContent>
              {recentOrgsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 py-2">
                      <Skeleton className="w-10 h-10 rounded-lg" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentMetaOrgs && recentMetaOrgs.length > 0 ? (
                <div className="space-y-4">
                  {recentMetaOrgs.map((org) => (
                    <div key={org.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{org.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(org.created_at), { 
                              addSuffix: true, 
                              locale: getDateLocale() 
                            })}
                          </p>
                        </div>
                      </div>
                      <span className={`text-sm ${org.is_active ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {org.is_active ? t('common.active') : t('common.inactive')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  {isRtl ? 'אין מטא-ארגונים עדיין' : 'No meta organizations yet'}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('admin.dashboard.recentActivity')}</CardTitle>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 py-2">
                      <Skeleton className="w-2 h-2 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-48 mb-2" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivity && recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <div className="flex-1">
                        <p className="font-medium">
                          {isRtl ? 'חבר חדש הצטרף ל' : 'New member joined '} 
                          <span className="text-primary">{activity.meta_organization?.name}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.created_at), { 
                            addSuffix: true, 
                            locale: getDateLocale() 
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  {isRtl ? 'אין פעילות אחרונה' : 'No recent activity'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
