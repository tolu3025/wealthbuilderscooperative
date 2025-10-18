import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { format } from "date-fns";

interface EnrollmentData {
  id: string;
  member_name: string;
  plan_name: string;
  enrolled_at: string;
  status: string;
}

const PlanEnrollments = () => {
  const [enrollments, setEnrollments] = useState<EnrollmentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    try {
      const { data, error } = await supabase
        .from('plan_enrollments')
        .select(`
          *,
          profiles!plan_enrollments_member_id_fkey(first_name, last_name),
          property_plans!plan_enrollments_plan_id_fkey(name)
        `)
        .order('enrolled_at', { ascending: false });

      if (error) throw error;

      const formatted: EnrollmentData[] = data.map((enrollment: any) => ({
        id: enrollment.id,
        member_name: `${enrollment.profiles.first_name} ${enrollment.profiles.last_name}`,
        plan_name: enrollment.property_plans.name,
        enrolled_at: enrollment.enrolled_at,
        status: enrollment.status,
      }));

      setEnrollments(formatted);
    } catch (error: any) {
      console.error('Error fetching enrollments:', error);
      toast.error("Failed to load enrollments");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AdminSidebar />
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader userName="Admin" />
          <main className="flex-1 p-6 space-y-6 overflow-auto">
            <div>
              <h1 className="text-3xl font-bold mb-2">Plan Enrollments</h1>
              <p className="text-muted-foreground">
                View all member enrollments in property investment plans
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>All Enrollments ({enrollments.length})</CardTitle>
                <CardDescription>
                  Members who have enrolled in property investment plans
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Enrolled Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrollments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No enrollments found
                        </TableCell>
                      </TableRow>
                    ) : (
                      enrollments.map((enrollment) => (
                        <TableRow key={enrollment.id}>
                          <TableCell className="font-medium">
                            {enrollment.member_name}
                          </TableCell>
                          <TableCell>{enrollment.plan_name}</TableCell>
                          <TableCell>
                            {format(new Date(enrollment.enrolled_at), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={enrollment.status === 'active' ? 'default' : 'secondary'}
                            >
                              {enrollment.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default PlanEnrollments;
