import nodemailer from "nodemailer";
import hbs from "nodemailer-express-handlebars";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
transporter.use(
  "compile",
  hbs({
    viewEngine: {
      extName: ".hbs",
      partialsDir: path.resolve("./templates/email/partials/"),
      layoutsDir: path.resolve("./templates/email/layouts/"),
      defaultLayout: false
    },
    viewPath: path.resolve("./templates/email/"),
    extName: ".hbs"
  })
);
export const sendMail = async ({
  to,
  subject,
  template,
  context,
  layout = "default" 
}) => {
  return transporter.sendMail({
    from: `"TimeBank" <${process.env.SMTP_USER}>`,
    to,
    subject,
    template,
    context,
    text: context.plainText || "Please view this email in HTML-compatible email client",
  });
};
