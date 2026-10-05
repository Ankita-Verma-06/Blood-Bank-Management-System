import java.io.*;
import javax.servlet.*;
import javax.servlet.http.*;
import javax.servlet.annotation.WebServlet;
import java.sql.*;

@WebServlet("/search")
public class SearchServlet extends HttpServlet {

    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        String state    = request.getParameter("state");
        String district = request.getParameter("district");

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Access-Control-Allow-Origin", "*");

        PrintWriter out = response.getWriter();

        if (state == null || district == null || state.trim().isEmpty() || district.trim().isEmpty()) {
            out.print("{\"error\":\"State and district are required\"}");
            return;
        }

        try {
            Connection con = DBConnection.getConnection();

            // Matches actual table columns: centre_name, address, state, district, category, phone, email
            // NO city column, NO timing column in blood_centre table
            String query = "SELECT centre_name, address, phone, email, category " +
                           "FROM blood_centre WHERE state=? AND district=? ORDER BY centre_name";

            PreparedStatement ps = con.prepareStatement(query);
            ps.setString(1, state.trim());
            ps.setString(2, district.trim());

            ResultSet rs = ps.executeQuery();

            StringBuilder json = new StringBuilder("[");
            boolean first = true;

            while (rs.next()) {
                if (!first) json.append(",");
                first = false;

                json.append("{");
                json.append("\"name\":"    ).append(jsonStr(rs.getString("centre_name"))).append(",");
                json.append("\"address\":").append(jsonStr(rs.getString("address")))    .append(",");
                json.append("\"phone\":"  ).append(jsonStr(rs.getString("phone")))      .append(",");
                json.append("\"email\":"  ).append(jsonStr(rs.getString("email")))      .append(",");
                json.append("\"category\":").append(jsonStr(rs.getString("category")));
                json.append("}");
            }

            json.append("]");

            rs.close();
            ps.close();
            con.close();

            out.print(json.toString());

        } catch (Exception e) {
            e.printStackTrace();
            out.print("{\"error\":\"" + e.getMessage().replace("\"", "'") + "\"}");
        }
    }

    private String jsonStr(String value) {
        if (value == null) return "\"\"";
        return "\"" + value.trim()
                            .replace("\\", "\\\\")
                            .replace("\"", "\\\"")
                            .replace("\n", "\\n")
                            .replace("\r", "\\r")
                      + "\"";
    }
}