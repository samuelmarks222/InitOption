FROM node:22-alpine
WORKDIR /app
COPY native-chart/simulation.mjs native-chart/websocket.mjs ./native-chart/
COPY server/otc ./server/otc/
ENV PORT=8092 OTC_DATA_DIR=/data
RUN mkdir -p /data && chown node:node /data
VOLUME /data
USER node
EXPOSE 8092
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:8092/otc/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/otc/start.mjs"]
