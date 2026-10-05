import javax.servlet.*;
import javax.servlet.http.*;
import javax.servlet.annotation.WebServlet;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;

@WebServlet("/ai")
public class AIServlet extends HttpServlet {

	private static final String API_KEY = System.getenv("OPENROUTER_API_KEY");

    protected void doGet(HttpServletRequest req, HttpServletResponse res)
            throws IOException {

        String query = req.getParameter("q");
        if (query == null) query = "";

        res.setContentType("application/json");

        try {
            URL url = new URL("https://openrouter.ai/api/v1/chat/completions");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();

            conn.setRequestMethod("POST");
            conn.setRequestProperty("Authorization", "Bearer " + API_KEY);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("HTTP-Referer", "http://localhost");
            conn.setRequestProperty("X-Title", "BBMS Project");
            conn.setDoOutput(true);

            // escape quotes in user input
            query = query.replace("\"", "\\\"");

            String body = "{"
                    + "\"model\":\"deepseek/deepseek-chat\","
                    + "\"messages\":["
                    + "{\"role\":\"system\",\"content\":\"You are a helpful blood bank assistant. Give short emergency advice.\"},"
                    + "{\"role\":\"user\",\"content\":\"" + query + "\"}"
                    + "]"
                    + "}";

            OutputStream os = conn.getOutputStream();
            os.write(body.getBytes("UTF-8"));
            os.close();

            int status = conn.getResponseCode();

            BufferedReader br;

            // ✅ handle both success and error
            if (status >= 200 && status < 300) {
                br = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            } else {
                br = new BufferedReader(new InputStreamReader(conn.getErrorStream()));
            }

            String line;
            StringBuilder response = new StringBuilder();

            while ((line = br.readLine()) != null) {
                response.append(line);
            }

            br.close();

            res.getWriter().print(response.toString());

        } catch (Exception e) {
            e.printStackTrace();
            res.getWriter().print("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }
}