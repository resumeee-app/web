import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Sparkles, BookOpen, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const HomePage: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="space-y-8">
      {/* Page Title with Semantic Level 1 Heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Resume Management
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Create, branch, and tailor ATS-optimized resumes with AI LLM models.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Create Resume</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Resume Branch</DialogTitle>
              <DialogDescription>
                Start a targeted resume branch tailored for a specific role or job description.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label
                  htmlFor="branch-name"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Branch / Target Role Name
                </label>
                <input
                  id="branch-name"
                  type="text"
                  placeholder="e.g. Senior Backend Engineer - FinTech"
                  className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={() => setIsDialogOpen(false)}>
                Create Branch
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs for Workspace Views */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList aria-label="Resume Views">
          <TabsTrigger value="active">Active Resumes</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-950/60 px-2 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 ring-1 ring-inset ring-indigo-700/10 dark:ring-indigo-700/30">
                  Master
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">Default Profile</span>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
                Core Master Resume
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                Primary source of truth for work experience, skills, education, and credentials.
              </p>
              <div className="mt-6 flex items-center justify-between">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/profile">Edit Profile</Link>
                </Button>
                <span className="text-xs text-slate-400 dark:text-slate-500">Sync: Up-to-date</span>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center rounded-md bg-amber-50 dark:bg-amber-950/60 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-700/10 dark:ring-amber-700/30">
                  Tailored
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">AI Branch</span>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
                Cloud Systems Architect
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                Tailored for distributed systems, AWS/GCP, and high-scale backend microservices.
              </p>
              <div className="mt-6 flex items-center justify-between">
                <Button variant="outline" size="sm">
                  View Versions
                </Button>
                <span className="text-xs text-slate-400 dark:text-slate-500">3 versions</span>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="archived" className="mt-6">
          <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-500" />
            <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">No archived resumes</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Completed job applications and older branches appear here.</p>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
            <Layers className="mx-auto h-8 w-8 text-slate-400 dark:text-slate-500" />
            <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">Built-in ATS Templates</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Standard Modern, Executive, Minimalist HTML/PDF templates.</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Feature Highlights Card */}
      <section
        aria-labelledby="features-heading"
        className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm"
      >
        <h2 id="features-heading" className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          <span>SPA Architecture Invariants</span>
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="p-4 rounded-md bg-slate-50 dark:bg-slate-800/50">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Static Object Storage Ready</h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Zero SSR dependencies. Pure HTML/JS/CSS assets ready for Cloudflare R2, AWS S3, or GCS.
            </p>
          </div>
          <div className="p-4 rounded-md bg-slate-50 dark:bg-slate-800/50">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">WAI-ARIA Accessibility</h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Radix UI unstyled primitives, keyboard navigation, focus trapping, and screen-reader compliant.
            </p>
          </div>
          <div className="p-4 rounded-md bg-slate-50 dark:bg-slate-800/50">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">OpenAPI Contract Typed</h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Automatic TypeScript definitions synchronized with the backend REST API OpenAPI 3.1 specification.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
