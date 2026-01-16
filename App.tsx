
import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { AppTab } from './types';
import { DesignVisualizer } from './components/DesignVisualizer';
import { QuotingTool } from './components/QuotingTool';
import { ResearchTool } from './components/ResearchTool';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DESIGN);

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === AppTab.DESIGN && <DesignVisualizer />}
      {activeTab === AppTab.QUOTE && <QuotingTool />}
      {activeTab === AppTab.RESEARCH && <ResearchTool />}
    </Layout>
  );
};

export default App;
