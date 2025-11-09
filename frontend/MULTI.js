// components/terms-dialog.tsx
import * as React from "react";
// ...existing imports remain the same

const TermsDialog = ({ setOpen, setAccepted }) => {
  const TNC_KEY = "trinidiumlab:tnc:2025-08";

  React.useEffect(() => {
    const handler = () => {
      try {
        localStorage.removeItem(TNC_KEY);
      } catch {}
      setAccepted(false);
      setOpen(true);
    };
    window.addEventListener("trinidiumlab:open-tnc", handler);
    return () => window.removeEventListener("trinidiumlab:open-tnc", handler);
  }, []);

  // ...rest of code here...
};

// components/privacy-dialog.tsx
import * as React from "react";
// ...existing imports remain the same

const PrivacyDialog = ({ setOpen, setAccepted }) => {
  const PRIV_KEY = "trinidiumlab:privacy:2025-08";

  React.useEffect(() => {
    const handler = () => {
      try {
        localStorage.removeItem(PRIV_KEY);
      } catch {}
      setAccepted(false);
      setOpen(true);
    };
    window.addEventListener("trinidiumlab:open-privacy", handler);
    return () => window.removeEventListener("trinidiumlab:open-privacy", handler);
  }, []);

  // ...rest of code here...
};

// components/dashboard-content.tsx
import { Upload, Play, Pause, Download, Trash2, CheckCircle, XCircle, Users, Mail, TrendingUp, Clock, Brain, FileText, SettingsIcon, Link, Wand2, RotateCcw, Shield } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from "ui";

const DashboardContent = () => {
  const reopenTerms = () => {
    try {
      localStorage.removeItem("trinidiumlab:tnc:2025-08");
    } catch {}
    window.dispatchEvent(new Event("trinidiumlab:open-tnc"));
  };

  const reopenPrivacy = () => {
    try {
      localStorage.removeItem("trinidiumlab:privacy:2025-08");
    } catch {}
    window.dispatchEvent(new Event("trinidiumlab:open-privacy"));
  };

  return (
    <div>
      {/* ...other content here... */}
      <div className="tab-pane" id="settings">
        {/* General Settings card */}
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-white" />
              General Settings
            </CardTitle>
            <CardDescription className="text-slate-400">
              Manage your general settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ...content here... */}
          </CardContent>
        </Card>

        {/* Legal & Privacy card */}
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-white" />
              Legal & Privacy
            </CardTitle>
            <CardDescription className="text-slate-400">
              Review and re-accept Terms & Conditions or Privacy Policy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Button
                onClick={reopenTerms}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                <FileText className="h-4 w-4 mr-2" />
                View Terms & Conditions
              </Button>
              <Button variant="outline" onClick={reopenPrivacy} className="border-slate-600 text-slate-300 bg-transparent">
                <Shield className="h-4 w-4 mr-2" />
                View Privacy Policy
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Tip: Clicking these will reset your consent and require you to re-accept before proceeding.
            </p>
          </CardContent>
        </Card>

        {/* Danger Zone card */}
        <Card className="bg-red-800/50 border-red-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <XCircle className="h-5 w-5 text-white" />
              Danger Zone
            </CardTitle>
            <CardDescription className="text-slate-400">
              Be careful with these options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ...content here... */}
          </CardContent>
        </Card>
      </div>
      {/* ...other content here... */}
    </div>
  );
};
