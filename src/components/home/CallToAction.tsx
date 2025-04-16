
import React from "react";
import { Button } from "@/components/ui/button";

const CallToAction = () => {
  return (
    <section className="bg-cornhole-wood wood-texture text-white py-12 px-4 mt-12">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">Join The League Today!</h2>
        <p className="text-lg md:text-xl mb-8 max-w-3xl mx-auto">
          Looking to compete in the next season? Contact us to register your team and join the excitement!
        </p>
        <Button asChild size="lg" className="bg-white text-cornhole-wood hover:bg-cornhole-cream hover:text-cornhole-navy">
          <a href="mailto:register@bagitupleague.com">Register Now</a>
        </Button>
      </div>
    </section>
  );
};

export default CallToAction;
