FROM oznu/homebridge:no-avahi-arm32v6
RUN setcap 'cap_net_bind_service=+ep' /usr/local/bin/node

COPY config.json /homebridge
COPY startup.sh /homebridge
