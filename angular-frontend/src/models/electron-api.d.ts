export interface ElectronAPI {
    getOmnAIScopeBackendPort: () => Promise<number>;
    getAnalysisBackendPort: () => Promise<number>
}

declare global {
    interface Window {
      electronAPI?: ElectronAPI;
    }
}
