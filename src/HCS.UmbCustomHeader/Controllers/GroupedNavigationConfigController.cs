using Asp.Versioning;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using HCS.UmbCustomHeader.Models;
using HCS.UmbCustomHeader.Services;
using Umbraco.Cms.Api.Common.Attributes;
using Umbraco.Cms.Api.Management.Controllers;
using Umbraco.Cms.Api.Management.Routing;

namespace HCS.UmbCustomHeader.Controllers;

[ApiVersion("1.0")]
[MapToApi(Constants.ApiName)]
[VersionedApiBackOfficeRoute("grouped-navigation")]
[ApiExplorerSettings(GroupName = "Grouped Navigation")]
public class GroupedNavigationConfigController(IGroupedNavigationConfigProvider provider) : ManagementApiControllerBase
{
    [HttpGet("config")]
    [ProducesResponseType<GroupedNavigationConfigResponse>(StatusCodes.Status200OK)]
    public IActionResult GetConfig() => Ok(provider.GetConfig());
}
