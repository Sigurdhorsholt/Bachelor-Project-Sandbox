FROM node:20-alpine AS frontend
WORKDIR /src
COPY Web ./Web
RUN --mount=type=cache,target=/root/.npm \
    cd Web && (npm ci || npm install) && npm run build

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY WebApi ./WebApi
COPY Application ./Application

# copy SPA dist into API wwwroot here
COPY --from=frontend /src/Web/dist ./WebApi/wwwroot

RUN dotnet restore WebApi/WebApi.csproj
RUN dotnet publish WebApi/WebApi.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "WebApi.dll"]
