declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
          start_parameter?: string;
        };
        expand: () => void;
        ready: () => void;
        close: () => void;
        openInvoice: (url: string, callback?: (status: string) => void) => void;
        MainButton?: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          setText: (text: string) => void;
          onClick: (callback: () => void) => void;
          show: () => void;
          hide: () => void;
        };
      };
    };
  }
}

export {};