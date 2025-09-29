import { AuthProvider } from "./auth/AuthContext"
import { CanvasProvider } from "./context/CanvasContext";
import { ChatProvider } from "./context/chat/ChatContext"
import { SocketProvider } from "./context/SocketContext"
import { AppRouter } from "./router/AppRouter"


import moment from "moment";
import 'moment/locale/es';
moment.locale('es');

export const ChantApp = () => {
  return (
    <CanvasProvider>
      <ChatProvider>
        <AuthProvider>
            <SocketProvider>
            <AppRouter/>
         </SocketProvider> 
        </AuthProvider>
      </ChatProvider>
    </CanvasProvider>
  )
}
