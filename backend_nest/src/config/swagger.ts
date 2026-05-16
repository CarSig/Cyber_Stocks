import { INestApplication } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle("Cyber Stock Intelligence API")
    .setDescription("REST + SSE API for cyber-security stock intelligence. All protected routes require a Bearer JWT. SSE routes accept `?token=` instead of the Authorization header.")
    .setVersion("1.0")
    .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" }, "bearer")
    .addTag("Auth", "Registration, login, and current-user lookup")
    .addTag("Stock", "Price history, sparklines, correlation matrix, and backtesting")
    .addTag("News", "Sentiment analysis and news–price correlation")
    .addTag("Trump", "Truth Social posts and post–price correlation")
    .addTag("Threat Intel", "CISA KEV, NVD, AlienVault OTX, and MISP vulnerability feeds")
    .addTag("Research", "AI-powered market research stream and chat")
    .addTag("Notifications", "Server-Sent Events stream for all domain events")
    .addTag("Admin", "Audit log and manual job triggers (admin only)")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api-docs", app, document, {
    customCss: `
      body { background: #0d0d0f; color: #e2e8f0; }
      .swagger-ui { background: #0d0d0f; color: #e2e8f0; }
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info .title, .swagger-ui .info p, .swagger-ui .info li { color: #e2e8f0; }
      .swagger-ui .scheme-container { background: #18181b; box-shadow: none; border-bottom: 1px solid #27272a; }
      .swagger-ui .opblock-tag { color: #e2e8f0; border-bottom: 1px solid #27272a; }
      .swagger-ui .opblock-tag:hover { background: #18181b; }
      .swagger-ui .opblock { background: #18181b; border-color: #27272a; }
      .swagger-ui .opblock .opblock-summary { border-color: #27272a; }
      .swagger-ui .opblock .opblock-summary-description { color: #9ba3af; }
      .swagger-ui .opblock-description-wrapper p, .swagger-ui .opblock-external-docs-wrapper p, .swagger-ui .opblock-title_normal p { color: #9ba3af; }
      .swagger-ui .opblock.opblock-get .opblock-summary { background: rgba(59,130,246,0.08); border-color: #3b82f6; }
      .swagger-ui .opblock.opblock-post .opblock-summary { background: rgba(34,197,94,0.08); border-color: #22c55e; }
      .swagger-ui .opblock.opblock-delete .opblock-summary { background: rgba(239,68,68,0.08); border-color: #ef4444; }
      .swagger-ui .opblock.opblock-get { border-color: #3b82f6; }
      .swagger-ui .opblock.opblock-post { border-color: #22c55e; }
      .swagger-ui .opblock.opblock-delete { border-color: #ef4444; }
      .swagger-ui .opblock-body { background: #18181b; }
      .swagger-ui section.models { display: none; }
      .swagger-ui .btn { background: #27272a; color: #e2e8f0; border-color: #3f3f46; }
      .swagger-ui .btn:hover { background: #3f3f46; }
      .swagger-ui .btn.execute { background: #3b82f6; color: #fff; border-color: #3b82f6; }
      .swagger-ui input, .swagger-ui textarea, .swagger-ui select { background: #27272a; color: #e2e8f0; border-color: #3f3f46; }
      .swagger-ui .response-col_status { color: #e2e8f0; }
      .swagger-ui .responses-inner h4, .swagger-ui .responses-inner h5 { color: #e2e8f0; }
      .swagger-ui .model-box { background: #18181b; }
      .swagger-ui .model { color: #e2e8f0; }
      .swagger-ui table thead tr td, .swagger-ui table thead tr th { color: #9ba3af; border-bottom: 1px solid #27272a; }
      .swagger-ui .parameter__name { color: #e2e8f0; }
      .swagger-ui .parameter__type { color: #9ba3af; }
      .swagger-ui .tab li { color: #9ba3af; }
      .swagger-ui .tab li.active { color: #e2e8f0; }
      .swagger-ui .highlight-code { background: #0d0d0f; }
      .swagger-ui .microlight { background: #0d0d0f !important; }
      .swagger-ui .auth-container { background: #18181b; }
      .swagger-ui .auth-container h4 { color: #e2e8f0; }
      .swagger-ui .dialog-ux .modal-ux { background: #18181b; border-color: #27272a; }
      .swagger-ui .dialog-ux .modal-ux-header { background: #18181b; border-bottom: 1px solid #27272a; }
      .swagger-ui .dialog-ux .modal-ux-header h3 { color: #e2e8f0; }
    `,
    customJsStr: `
      window.onload = (function(originalOnload) {
        return function() {
          if (originalOnload) originalOnload();
          try {
            var params = new URLSearchParams(window.location.search);
            var token = params.get('token') || localStorage.getItem('auth_token');
            if (token) {
              localStorage.setItem('auth_token', token);
              window.ui.authActions.authorize({
                bearer: { name: 'bearer', schema: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, value: token }
              });
              history.replaceState(null, '', window.location.pathname);
            }
          } catch(e) {}
        };
      })(window.onload);
    `,
    swaggerOptions: {
      persistAuthorization: true,
      defaultModelsExpandDepth: -1,
      defaultModelExpandDepth: 3,
      defaultModelRendering: "example",
      docExpansion: "list",
    },
  });
}
