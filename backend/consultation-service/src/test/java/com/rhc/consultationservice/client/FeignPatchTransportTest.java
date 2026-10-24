package com.rhc.consultationservice.client;

import feign.Request;
import feign.Response;
import feign.hc5.ApacheHttp5Client;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;

class FeignPatchTransportTest {

    @Test
    void apacheFeignTransportSendsPatchRequests() throws Exception {
        AtomicReference<String> receivedMethod = new AtomicReference<>();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/api/appointments/42/complete", exchange -> {
            receivedMethod.set(exchange.getRequestMethod());
            exchange.sendResponseHeaders(204, -1);
            exchange.close();
        });
        server.start();

        try {
            String url = "http://127.0.0.1:" + server.getAddress().getPort()
                    + "/api/appointments/42/complete";
            Request request = Request.create(
                    Request.HttpMethod.PATCH,
                    url,
                    Map.of(),
                    new byte[0],
                    StandardCharsets.UTF_8);

            try (Response response = new ApacheHttp5Client().execute(request, new Request.Options(1000, 1000))) {
                assertEquals(204, response.status());
            }
            assertEquals("PATCH", receivedMethod.get());
        } finally {
            server.stop(0);
        }
    }
}
