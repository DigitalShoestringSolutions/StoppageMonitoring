FROM node:19-alpine AS appbuild
COPY ./code/fault_monitoring/react/package.json /
RUN npm install
RUN npm -v
COPY ./code/fault_monitoring/react/ /
RUN npm run build

FROM digitalshoestring/shoestring-django:v0.0.1
ENV PYTHONUNBUFFERED 1
COPY ./requirements.txt /requirements.txt
RUN pip install -r /requirements.txt && rm -f /requirements.txt
WORKDIR /app
ADD ./code /app/
COPY --from=appbuild /build /app/static
COPY --from=appbuild /build /app/fault_monitoring/static
COPY --from=appbuild /build/index.html /app/fault_monitoring/templates/index.html
