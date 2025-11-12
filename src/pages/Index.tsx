import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Truck, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="text-center space-y-6 p-8">
        <div className="flex justify-center mb-6">
          <div className="bg-primary/10 p-6 rounded-full">
            <Truck className="h-16 w-16 text-primary" />
          </div>
        </div>
        <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Vehicle Management System
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Professional fleet tracking and trip management for marketing teams
        </p>
        <Button size="lg" onClick={() => navigate("/auth")} className="mt-8">
          Get Started
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default Index;
