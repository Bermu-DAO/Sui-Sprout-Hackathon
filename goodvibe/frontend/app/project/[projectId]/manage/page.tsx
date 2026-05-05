'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Manage 功能已併入專案內頁的 Updates 區塊，此路由直接導向專案頁 */
export default function ManageProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  useEffect(() => {
    if (projectId) {
      router.replace(`/project/${projectId}`);
    }
  }, [projectId, router]);

  return (
    <div className="min-h-screen bg-canvas-default flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-2 border-ink-900 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-ink-600">Redirecting to project...</p>
      </div>
    </div>
  );
}
