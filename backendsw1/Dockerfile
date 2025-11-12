# -----------------------------------------------------------------
# ETAPA 1: El Entorno Base (Node.js + Dependencias de Flutter)
# -----------------------------------------------------------------

# 1. Usar una imagen base de Node.js (v18 LTS)
# (Basado en tu package.json, que no especifica versión)
FROM node:18-slim

# 2. Instalar las dependencias del sistema operativo que Flutter necesita
# (git, curl y xz-utils son para descargar y descomprimir el SDK)
RUN apt-get update && apt-get install -y \
    git \
    curl \
    unzip \
    xz-utils \
    libglu1-mesa \
    && rm -rf /var/lib/apt/lists/*

# -----------------------------------------------------------------
# ETAPA 2: Instalar el SDK de Flutter
# -----------------------------------------------------------------

# 3. Moverse al directorio donde vivirá el SDK
WORKDIR /usr/local

# 4. Descargar y descomprimir una versión estable de Flutter
RUN curl -o flutter.tar.xz "https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.22.2-stable.tar.xz"
RUN tar -xf flutter.tar.xz
RUN rm flutter.tar.xz

# 5. Añadir el SDK de Flutter al PATH del sistema
# ¡Esta es la clave para que se encuentre el comando "flutter" que da el error!
ENV PATH="$PATH:/usr/local/flutter/bin"

# 6. (Opcional) Aceptar licencias y precargar Flutter
RUN flutter precache
RUN flutter doctor

# -----------------------------------------------------------------
# ETAPA 3: Preparar NUESTRA Aplicación de Node.js
# -----------------------------------------------------------------

# 7. Crear el directorio de trabajo para nuestra app
WORKDIR /app

# 8. Copiar el package.json y package-lock.json
# (Lo hacemos primero para aprovechar el caché de Docker)
COPY package*.json ./

# 9. Instalar las dependencias de Node.js
# (Esto instala express, cors, mongoose, fs-extra, etc.)
RUN npm install

# 10. Copiar el resto del código de nuestra app
# (Esto copia tu index.js, models/server.js, etc.)
COPY . .

# 11. Exponer el puerto que Render espera
# (Asumimos que tu 'models/server.js' usa process.env.PORT)
EXPOSE 10000

# 12. Comando de inicio (¡Tomado de tu package.json!)
CMD [ "npm", "start" ]