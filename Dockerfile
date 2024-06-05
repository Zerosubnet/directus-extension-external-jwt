FROM busybox


RUN mkdir -p /app/hooks/directus-extension-external-jwt/
WORKDIR /app

ADD dist/index.js ./hooks/directus-extension-external-jwt/
ADD docker/install.sh /install.sh

ENTRYPOINT [ "/install.sh" ]