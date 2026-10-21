namespace HCS.UmbCustomHeader.Models;

public class GroupedNavigationConfigResponse
{
    public bool Enabled { get; set; }

    public List<GroupedNavigationGroupResponse> Groups { get; set; } = [];
}

public class GroupedNavigationGroupResponse
{
    public string Alias { get; set; } = string.Empty;

    public string Label { get; set; } = string.Empty;

    public string? Icon { get; set; }

    public int? Weight { get; set; }

    public List<string> Sections { get; set; } = [];
}
