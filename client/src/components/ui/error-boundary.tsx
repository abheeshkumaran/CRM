import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Uncaught error in component ${this.props.name || 'Unknown'}:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Card className="h-full min-h-[200px] flex items-center justify-center bg-destructive/10 border-destructive/20">
          <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <h3 className="font-semibold text-destructive">Component Error</h3>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              {this.props.name ? `Failed to load ${this.props.name}` : 'Something went wrong'}
            </p>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
