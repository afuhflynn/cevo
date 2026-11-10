"use client";

import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  InfoIcon,
  Loader2Icon,
} from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export function ToastDemo() {
  const [loading, setLoading] = React.useState(false);

  const handleSuccess = () => {
    toast.success("Document saved successfully", {
      description: "Chapter 3 methodology draft synced to cloud storage.",
    });
  };

  const handleError = () => {
    toast.error("Citation format warning", {
      description: "DOI 10.1145/3290605 requires volume and issue number.",
    });
  };

  const handleInfo = () => {
    toast.info("Institutional template active", {
      description:
        "University of Buea B.Sc. guidelines enforced (1.5 line spacing).",
    });
  };

  const handleWarning = () => {
    toast.warning("Low credit balance", {
      description: "Only 15 credits remain. Top up with MTN or Orange Money.",
    });
  };

  const handleAsyncPromise = async () => {
    setLoading(true);
    const mockAsyncWork = new Promise((resolve) => {
      setTimeout(() => {
        resolve({ title: "Export complete", pages: 42 });
      }, 1500);
    });

    try {
      await toast.promise(mockAsyncWork, {
        loading: {
          title: "Compiling academic report...",
          description: "Generating PDF with institutional preliminary pages.",
        },
        success: () => ({
          title: "PDF ready for download",
          description:
            "42 pages compiled adhering to Cameroon institutional rules.",
        }),
        error: () => ({
          title: "Export compilation failed",
          description: "Unable to compile document AST. Please retry.",
        }),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2.5">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSuccess}
        className="text-xs"
      >
        <CheckCircle2Icon className="mr-1.5 size-3.5 text-emerald-500" />
        Success toast
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleInfo}
        className="text-xs"
      >
        <InfoIcon className="mr-1.5 size-3.5 text-primary" />
        Info toast
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleWarning}
        className="text-xs"
      >
        <AlertTriangleIcon className="mr-1.5 size-3.5 text-amber-500" />
        Warning toast
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleError}
        className="text-xs"
      >
        <AlertCircleIcon className="mr-1.5 size-3.5 text-destructive" />
        Error toast
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={handleAsyncPromise}
        className="text-xs"
      >
        {loading ? (
          <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
        ) : (
          <span className="mr-1.5 inline-block size-2 rounded-full bg-primary" />
        )}
        Async promise toast
      </Button>
    </div>
  );
}
