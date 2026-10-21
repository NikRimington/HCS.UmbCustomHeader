namespace HCS.UmbCustomHeader.Configuration;

public class GroupedNavigationOptions
{
    public bool Enabled { get; set; } = true;

    public List<GroupOptions> Groups { get; set; } = [];
}

public class GroupOptions
{
    public string Alias { get; set; } = string.Empty;

    public string Label { get; set; } = string.Empty;

    public string? Icon { get; set; }

    /// <summary>
    /// Optional. Places the group by weight among top-level items instead of at its first member's position.
    /// </summary>
    public int? Weight { get; set; }

    public List<string> Sections { get; set; } = [];
}
