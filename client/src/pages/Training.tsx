import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  User, 
  Target, 
  Megaphone, 
  Zap, 
  PieChart, 
  Settings, 
  Calendar, 
  MessageSquare, 
  ShieldCheck, 
  Sparkles, 
  HelpCircle, 
  ChevronRight,
  PlayCircle,
  CheckCircle2,
  FileText,
  Users,
  Building,
  MapPin,
  PhoneCall,
  Trophy,
  GitBranch,
  Search
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import PageHeader from '@/components/shared/PageHeader';
import { getUserInfo, isAdmin, isSuperAdmin } from '@/lib/utils';

interface Topic {
  title: string;
  content: string;
  role?: string;
}

interface Module {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  description: string;
  topics: Topic[];
  role?: string;
}

const TrainingPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const user = getUserInfo();
  const userIsAdmin = isAdmin(user);
  const userIsSuperAdmin = isSuperAdmin(user);

  const modules = useMemo<Module[]>(() => [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: BookOpen,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      description: 'New to the CRM? Start here to understand the core workflow.',
      topics: [
        {
          title: 'Dashboard Overview',
          content: 'The dashboard is your central hub. It shows real-time metrics for Attend/Unattended leads, conversion rates, and recent activity feeds.',
        },
        {
          title: 'Profile & Initial Setup',
          content: 'Navigate to Settings > Profile to update your personal information, signature, and notification preferences.',
        }
      ]
    },
    {
      id: 'leads',
      title: 'Lead Management',
      icon: User,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      description: 'Master lead creation, tracking, and status management.',
      topics: [
        {
          title: 'Creating & Tracking Leads',
          content: "Add leads manually using the 'New Lead' button. Keep statuses updated to ensure accurate analytics.",
        },
        {
          title: 'Lead Statuses & Transitions',
          content: 'Leads move through statuses like New, Interested, Qualified, and Closed.',
        },
        {
          title: 'Bulk Operations',
          content: 'Admins can bulk import leads via CSV/Excel. Mapping guides are provided in the Import section.',
          role: 'admin'
        }
      ]
    },
    {
      id: 'sales',
      title: 'Sales Engine',
      icon: Target,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      description: 'Manage the full sales lifecycle from Contacts to Opportunities.',
      topics: [
        {
          title: 'Pipeline Management',
          content: 'Use Opportunities to track potential deals. Drag and drop deals across stages in the Kanban view.',
        },
        {
          title: 'Quotes & Products',
          content: 'Generate professional quotes directly from Opportunities.',
        },
        {
          title: 'EMI & Payment Schedules',
          content: 'Track post-sale payments using EMI schedules.',
        }
      ]
    },
    {
      id: 'marketing',
      title: 'Marketing Suite',
      icon: Megaphone,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      description: 'Run multichannel campaigns and track ROI.',
      role: 'admin',
      topics: [
        {
          title: 'Multichannel Campaigns',
          content: 'Launch WhatsApp, SMS, and Email campaigns for targeted segments.',
        },
        {
          title: 'Ads Manager',
          content: 'Connect Facebook/Google ads to track ROI directly in the CRM.',
        },
        {
          title: 'Landing Pages & Forms',
          content: 'Design custom landing pages and web forms to capture leads automatically.',
        }
      ]
    },
    {
      id: 'interactions',
      title: 'Action Center',
      icon: Zap,
      color: 'text-rose-500',
      bg: 'bg-rose-500/10',
      description: 'Log every interaction to keep your pipeline moving.',
      topics: [
        {
          title: 'Logging Notes & Activity',
          content: 'Use the "Add Note" button to record observations. These appear in the timeline for team context.',
        },
        {
          title: 'Meetings & Follow-ups',
          content: 'Schedule meetings and set follow-up reminders to ensure you never miss a touchpoint.',
        },
        {
          title: 'Stay Notified',
          content: 'Check the real-time notification bell for assignments and task deadlines.',
        }
      ]
    },
    {
      id: 'power-user',
      title: 'Power User Tips',
      icon: Sparkles,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      description: 'Navigate like a pro with shortcuts and advanced tools.',
      topics: [
        {
          title: 'Command Center (Cmd + K)',
          content: 'Press Cmd + K (or Ctrl + K) anywhere to open Global Search. Find anything instantly.',
        },
        {
          title: 'Real-time Collaboration',
          content: 'Receive instant alerts for lead assignments and client activity.',
        },
        {
          title: 'Mobile Sync',
          content: 'Work seamlessly between the desktop and the Android Native app.',
        }
      ]
    }
  ].filter(m => !m.role || (m.role === 'admin' && userIsAdmin)), [userIsAdmin]);

  const filteredModules = modules.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.topics.some(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 space-y-8 p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-neutral-900 border border-neutral-800 p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -m-12 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 -m-12 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        
        <div className="relative z-10 max-w-2xl">
          <Badge variant="outline" className="mb-4 border-primary/30 text-primary-foreground/80 px-4 py-1.5 uppercase tracking-widest text-[10px] font-bold">
            Learning Hub
          </Badge>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tighter">
            Master Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">Sales DNA.</span>
          </h1>
          <p className="text-neutral-400 text-lg mb-8 leading-relaxed">
            Explore comprehensive guides and tutorials for every feature. Transform leads into loyalty with expert knowledge.
          </p>
          
          <div className="relative group max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search for tutorials..." 
              className="bg-neutral-800/50 border-neutral-700 pl-10 h-12 rounded-xl focus-visible:ring-primary/50 text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="modules" className="space-y-8">
        <div className="flex items-center justify-between">
          <TabsList className="bg-neutral-900 border border-neutral-800 p-1 rounded-xl">
            <TabsTrigger value="modules" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-white rounded-lg px-6 py-2">
              Core Modules
            </TabsTrigger>
            {userIsAdmin && (
              <TabsTrigger value="advanced" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-white rounded-lg px-6 py-2">
                Admin Workflow
              </TabsTrigger>
            )}
            <TabsTrigger value="faq" className="data-[state=active]:bg-neutral-800 data-[state=active]:text-white rounded-lg px-6 py-2">
              FAQs
            </TabsTrigger>
          </TabsList>
          
          <div className="hidden md:flex gap-4">
            <Button variant="outline" className="border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800 rounded-xl gap-2 h-10">
              <PlayCircle className="h-4 w-4" /> Video Guides
            </Button>
            <Button className="rounded-xl shadow-lg shadow-primary/20 gap-2 h-10">
              <HelpCircle className="h-4 w-4" /> Contact Support
            </Button>
          </div>
        </div>

        <TabsContent value="modules" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredModules.map((module) => (
              <Card key={module.id} className="bg-neutral-900 border-neutral-800 hover:border-neutral-700 transition-all duration-300 group overflow-hidden">
                <CardHeader>
                  <div className={`${module.bg} p-3 rounded-2xl w-fit mb-4 group-hover:scale-110 transition-transform`}>
                    <module.icon className={`h-6 w-6 ${module.color}`} />
                  </div>
                  <CardTitle className="text-xl font-bold text-white group-hover:text-primary transition-colors">{module.title}</CardTitle>
                  <CardDescription className="text-neutral-400 line-clamp-2">{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {module.topics
                      .filter(t => !t.role || (t.role === 'admin' && userIsAdmin))
                      .slice(0, 3)
                      .map((topic, i) => (
                      <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-neutral-800/50 transition-colors cursor-pointer group/item">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm text-neutral-300 font-medium group-hover/item:text-white">{topic.title}</span>
                      </div>
                    ))}
                    <Button variant="link" className="text-primary p-0 h-auto mt-2 flex items-center gap-1 text-xs hover:gap-2 transition-all">
                      View details <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {userIsAdmin && (
          <TabsContent value="advanced" className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <GitBranch className="h-5 w-5 text-amber-500" /> System Hierarchy & Roles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-neutral-400">
                  Maintain strict data privacy and structural integrity using our advanced Hierarchy engine.
                </p>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-neutral-800/30 border border-neutral-700/50">
                    <h4 className="text-sm font-bold text-white mb-2">Defining Roles</h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Admins can create custom roles with granular permissions. Control who can view, edit, delete, or export data.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-neutral-800/30 border border-neutral-700/50">
                    <h4 className="text-sm font-bold text-white mb-2">Territory Management</h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Assign sales territories to branches. Leads are automatically routed based on geography or custom conditions.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Zap className="h-5 w-5 text-primary" /> Automation & APIs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-neutral-400">
                  Connect external tools and automate repetitive tasks.
                </p>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-neutral-800/30 border border-neutral-700/50">
                    <h4 className="text-sm font-bold text-white mb-2">Workflow Builder</h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Set up "If This, Then That" rules for lead assignments, status updates, and automated notifications.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-neutral-800/30 border border-neutral-700/50">
                    <h4 className="text-sm font-bold text-white mb-2">Developer Keys</h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Access API keys in Settings {'>'} Developer to connect Zapier, Make, or custom webhooks.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="faq" className="max-w-3xl mx-auto py-8">
          <div className="space-y-6">
            {[
              { q: "How do I recover a deleted lead?", a: "Deletion is permanent. Contact your Admin to check for periodic database backups if recovery is required." },
              { q: "Can I use WhatsApp for marketing?", a: "Yes, use template messages for bulk marketing once your API is connected." },
              { q: "Why is my lead score low?", a: "Heat scores increase with client interaction (email opens, link clicks). Encourage engagement to see real-time score updates." }
            ].map((item, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-3">
                  <Badge variant="secondary" className="bg-primary/20 text-primary">Q</Badge> {item.q}
                </h3>
                <p className="text-neutral-400 text-sm pl-11 leading-relaxed">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Support Footer */}
      <div className="flex flex-col md:flex-row items-center justify-between p-8 rounded-3xl bg-gradient-to-r from-neutral-900 to-neutral-800 border border-neutral-700 mt-12 gap-6">
        <div className="flex items-center gap-6">
          <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">Still have questions?</h3>
            <p className="text-neutral-400 text-sm">Join our weekly training webinars or contact our success team.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <Button className="rounded-xl px-8 h-12">Visit Community</Button>
          <Button variant="outline" className="rounded-xl border-neutral-700 bg-transparent hover:bg-neutral-800 text-white px-8 h-12">Submit Ticket</Button>
        </div>
      </div>
    </div>
  );
};

export default TrainingPage;
