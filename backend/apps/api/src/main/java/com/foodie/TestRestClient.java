import org.springframework.web.client.RestClient;

public class TestRestClient {
    public static void main(String[] args) {
        RestClient client = RestClient.builder()
            .baseUrl("https://sandbox.cashfree.com/pg")
            .defaultHeader("x-client-id", "")
            .defaultHeader("x-client-secret", "")
            .build();
        System.out.println("No crash!");
    }
}
