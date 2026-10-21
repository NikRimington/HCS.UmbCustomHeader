using Asp.Versioning;
using Microsoft.AspNetCore.Mvc.ApiExplorer;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi;
using HCS.UmbCustomHeader.Configuration;
using HCS.UmbCustomHeader.Services;
using Swashbuckle.AspNetCore.SwaggerGen;
using Umbraco.Cms.Api.Common.OpenApi;
using Umbraco.Cms.Api.Management.OpenApi;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;

namespace HCS.UmbCustomHeader.Composers;

public class GroupedNavigationComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        builder.Services.Configure<GroupedNavigationOptions>(builder.Config.GetSection(Constants.ConfigSectionName));
        builder.Services.TryAddEnumerable(
            ServiceDescriptor.Singleton<IValidateOptions<GroupedNavigationOptions>, GroupedNavigationOptionsValidator>());
        builder.Services.AddSingleton<IGroupedNavigationConfigProvider, GroupedNavigationConfigProvider>();

        builder.Services.AddSingleton<IOperationIdHandler, GroupedNavigationOperationIdHandler>();

        builder.Services.Configure<SwaggerGenOptions>(opt =>
        {
            opt.SwaggerDoc(Constants.ApiName, new OpenApiInfo
            {
                Title = "Grouped Navigation Backoffice API",
                Version = "1.0",
            });
            opt.OperationFilter<GroupedNavigationOperationSecurityFilter>();
        });
    }

    public class GroupedNavigationOperationSecurityFilter : BackOfficeSecurityRequirementsOperationFilterBase
    {
        protected override string ApiName => Constants.ApiName;
    }

    public class GroupedNavigationOperationIdHandler(IOptions<ApiVersioningOptions> apiVersioningOptions)
        : OperationIdHandler(apiVersioningOptions)
    {
        protected override bool CanHandle(ApiDescription apiDescription, ControllerActionDescriptor controllerActionDescriptor)
            => controllerActionDescriptor.ControllerTypeInfo.Namespace?
                .StartsWith("HCS.UmbCustomHeader.Controllers", StringComparison.OrdinalIgnoreCase) is true;

        public override string Handle(ApiDescription apiDescription)
            => $"{apiDescription.ActionDescriptor.RouteValues["action"]}";
    }
}
