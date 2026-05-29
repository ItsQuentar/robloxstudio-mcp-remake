import { TweenService } from "@rbxts/services";
import State from "./State";
import { Connection } from "../types";

interface UIElements {
	screenGui: DockWidgetPluginGui;
	mainFrame: Frame;
	contentFrame: ScrollingFrame;
	statusLabel: TextLabel;
	detailStatusLabel: TextLabel;
	statusIndicator: Frame;
	statusPulse: Frame;
	statusText: TextLabel;
	connectButton: TextButton;
	connectStroke: UIStroke;
	urlInput: TextBox;
	step1Dot: Frame;
	step1Label: TextLabel;
	step2Dot: Frame;
	step2Label: TextLabel;
	step3Dot: Frame;
	step3Label: TextLabel;
	troubleshootLabel: TextLabel;
	tabBar: Frame;
}

let elements: UIElements = undefined!;
let pulseAnimation: Tween | undefined;
let buttonHover = false;

interface TabButton {
	frame: Frame;
	label: TextLabel;
	dot: Frame;
	closeBtn: TextButton;
}
let tabButtons: Map<number, TabButton> = new Map();

const TWEEN_QUICK = new TweenInfo(0.15, Enum.EasingStyle.Quad, Enum.EasingDirection.Out);

function tweenProp(instance: Instance, props: Record<string, unknown>) {
	TweenService.Create(instance, TWEEN_QUICK, props as unknown as { [key: string]: unknown }).Play();
}

const C = {
	bg: Color3.fromRGB(10, 14, 24),
	glass: Color3.fromRGB(30, 45, 75),
	surface: Color3.fromRGB(45, 65, 100),
	border: Color3.fromRGB(60, 90, 140),
	subtle: Color3.fromRGB(80, 110, 160),
	muted: Color3.fromRGB(140, 170, 220),
	dim: Color3.fromRGB(180, 200, 240),
	label: Color3.fromRGB(210, 225, 255),
	white: Color3.fromRGB(245, 250, 255),
	accent: Color3.fromRGB(0, 162, 255),
	green: Color3.fromRGB(0, 255, 170),
	yellow: Color3.fromRGB(255, 215, 0),
	red: Color3.fromRGB(255, 65, 65),
	gray: Color3.fromRGB(140, 140, 140),
	accentLight: Color3.fromRGB(120, 140, 255),
	card: Color3.fromRGB(18, 18, 24),
};

const CORNER = new UDim(0, 6);

function getStatusDotColor(connIndex: number): Color3 {
	const conn = State.getConnection(connIndex);
	if (!conn || !conn.isActive) return C.red;
	if (conn.consecutiveFailures >= conn.maxFailuresBeforeError) return C.red;
	if (conn.lastHttpOk) return C.green;
	return C.yellow;
}

function setButtonConnect(btn: TextButton, stroke: UIStroke) {
	btn.Text = "Connect";
	btn.TextColor3 = C.white;
	btn.BackgroundColor3 = C.accent;
	stroke.Color = C.subtle;
}

function setButtonDisconnect(btn: TextButton, stroke: UIStroke) {
	btn.Text = "Disconnect";
	btn.TextColor3 = C.red;
	btn.BackgroundColor3 = C.bg;
	stroke.Color = Color3.fromRGB(120, 45, 45);
}

function stopPulseAnimation() {
	if (pulseAnimation) {
		pulseAnimation.Cancel();
		pulseAnimation = undefined;
	}
	elements.statusPulse.Size = new UDim2(0, 10, 0, 10);
	elements.statusPulse.Position = new UDim2(0, 0, 0, 0);
	elements.statusPulse.BackgroundTransparency = 0.7;
}

function startPulseAnimation() {
	stopPulseAnimation();
	const tweenInfo = new TweenInfo(1.5, Enum.EasingStyle.Sine, Enum.EasingDirection.Out, -1, false);
	pulseAnimation = TweenService.Create(elements.statusPulse, tweenInfo, {
		Size: new UDim2(0, 24, 0, 24),
		Position: new UDim2(0, -7, 0, -7),
		BackgroundTransparency: 1,
	});
	pulseAnimation.Play();
}

let refreshTabBar: () => void;
let switchToTab: (index: number) => void;

function createTabButton(connIndex: number) {
	const conn = State.getConnection(connIndex);
	if (!conn) return;

	const isActive = connIndex === State.getActiveTabIndex();

	const tabFrame = new Instance("Frame");
	tabFrame.Size = new UDim2(0, 64, 1, -6);
	tabFrame.Position = new UDim2(0, 0, 0, 3);
	tabFrame.BackgroundColor3 = isActive ? C.glass : C.bg;
	tabFrame.BackgroundTransparency = isActive ? 0.3 : 0.7;
	tabFrame.BorderSizePixel = 0;
	tabFrame.LayoutOrder = connIndex;

	const tabCorner = new Instance("UICorner");
	tabCorner.CornerRadius = new UDim(0, 4);
	tabCorner.Parent = tabFrame;

	const tabStroke = new Instance("UIStroke");
	tabStroke.Color = isActive ? C.border : C.glass;
	tabStroke.Thickness = 1;
	tabStroke.Transparency = isActive ? 0.5 : 0.8;
	tabStroke.Parent = tabFrame;

	const dot = new Instance("Frame");
	dot.Size = new UDim2(0, 6, 0, 6);
	dot.Position = new UDim2(0, 6, 0.5, -3);
	dot.BackgroundColor3 = getStatusDotColor(connIndex);
	dot.BorderSizePixel = 0;
	dot.Parent = tabFrame;

	const dotCorner = new Instance("UICorner");
	dotCorner.CornerRadius = new UDim(1, 0);
	dotCorner.Parent = dot;

	const label = new Instance("TextLabel");
	label.Size = new UDim2(1, -28, 1, 0);
	label.Position = new UDim2(0, 16, 0, 0);
	label.BackgroundTransparency = 1;
	label.Text = tostring(conn.port);
	label.TextColor3 = isActive ? C.white : C.muted;
	label.TextSize = 10;
	label.Font = Enum.Font.GothamMedium;
	label.TextXAlignment = Enum.TextXAlignment.Left;
	label.TextTruncate = Enum.TextTruncate.AtEnd;
	label.Parent = tabFrame;

	const closeBtn = new Instance("TextButton");
	closeBtn.Size = new UDim2(0, 14, 0, 14);
	closeBtn.Position = new UDim2(1, -18, 0.5, -7);
	closeBtn.BackgroundTransparency = 1;
	closeBtn.Text = "x";
	closeBtn.TextColor3 = C.muted;
	closeBtn.TextSize = 10;
	closeBtn.Font = Enum.Font.GothamBold;
	closeBtn.Parent = tabFrame;

	const clickBtn = new Instance("TextButton");
	clickBtn.Size = new UDim2(1, -16, 1, 0);
	clickBtn.Position = new UDim2(0, 0, 0, 0);
	clickBtn.BackgroundTransparency = 1;
	clickBtn.Text = "";
	clickBtn.Parent = tabFrame;

	clickBtn.Activated.Connect(() => switchToTab(connIndex));
	closeBtn.Activated.Connect(() => {
		const c = State.getConnection(connIndex);
		if (c && c.isActive) return;
		if (State.getConnections().size() <= 1) return;
		State.removeConnection(connIndex);
		refreshTabBar();
		switchToTab(State.getActiveTabIndex());
	});

	tabFrame.Parent = elements.tabBar;
	tabButtons.set(connIndex, { frame: tabFrame, label, dot, closeBtn });
}

refreshTabBar = () => {
	tabButtons.forEach((tb) => {
		if (tb.frame) tb.frame.Destroy();
	});
	tabButtons = new Map();
	for (let i = 0; i < State.getConnections().size(); i++) {
		createTabButton(i);
	}
	tabButtons.forEach((tb, i) => {
		const active = i === State.getActiveTabIndex();
		if (tb.frame) {
			tb.frame.BackgroundColor3 = active ? C.glass : C.bg;
			tb.frame.BackgroundTransparency = active ? 0.3 : 0.7;
		}
		if (tb.label) tb.label.TextColor3 = active ? C.white : C.muted;
	});
};

switchToTab = (index: number) => {
	if (index < 0 || index >= State.getConnections().size()) return;
	State.setActiveTabIndex(index);
	const conn = State.getActiveConnection();

	tabButtons.forEach((tb, i) => {
		const active = i === index;
		if (tb.frame) {
			tweenProp(tb.frame, { BackgroundColor3: active ? C.glass : C.bg, BackgroundTransparency: active ? 0.3 : 0.7 });
		}
		if (tb.label) tb.label.TextColor3 = active ? C.white : C.muted;
	});

	elements.urlInput.Text = conn.serverUrl;
	updateUIState();
};

function updateTabDot(connIndex: number) {
	const tb = tabButtons.get(connIndex);
	if (tb && tb.dot) {
		tb.dot.BackgroundColor3 = getStatusDotColor(connIndex);
	}
}

function init(pluginRef: Plugin) {
	const CURRENT_VERSION = State.CURRENT_VERSION;

	const screenGui = pluginRef.CreateDockWidgetPluginGuiAsync(
		"MCPServerInterface",
		new DockWidgetPluginGuiInfo(Enum.InitialDockState.Float, false, false, 320, 280, 280, 200),
	);
	(screenGui as unknown as { Title: string }).Title = `MCP Studio v${CURRENT_VERSION}`;

	const mainFrame = new Instance("Frame");
	mainFrame.Size = new UDim2(1, 0, 1, 0);
	mainFrame.BackgroundColor3 = C.bg;
	mainFrame.BorderSizePixel = 0;
	mainFrame.Parent = screenGui;

	// Background Blue Glow Effect
	const glow = new Instance("Frame");
	glow.Size = new UDim2(1.5, 0, 1.5, 0);
	glow.Position = new UDim2(-0.25, 0, -0.25, 0);
	glow.BackgroundColor3 = C.accent;
	glow.BackgroundTransparency = 0.95;
	glow.BorderSizePixel = 0;
	glow.ZIndex = 0;
	glow.Parent = mainFrame;

	const header = new Instance("Frame");
	header.Size = new UDim2(1, 0, 0, 48);
	header.BackgroundColor3 = C.bg;
	header.BackgroundTransparency = 0.5;
	header.BorderSizePixel = 0;
	header.Parent = mainFrame;

	const headerLine = new Instance("Frame");
	headerLine.Size = new UDim2(1, -16, 0, 1);
	headerLine.Position = new UDim2(0, 8, 1, -1);
	headerLine.BackgroundColor3 = C.glass;
	headerLine.BorderSizePixel = 0;
	headerLine.Parent = header;

	const titleLabel = new Instance("TextLabel");
	titleLabel.Size = new UDim2(1, -50, 0, 24);
	titleLabel.Position = new UDim2(0, 12, 0, 6);
	titleLabel.BackgroundTransparency = 1;
	titleLabel.RichText = true;
	titleLabel.Text = `<font color="#00A2FF">ItsQuentar Plugin Remake</font> <font color="#94A3B8">v${CURRENT_VERSION}</font>`;
	titleLabel.TextColor3 = C.white;
	titleLabel.TextSize = 14;
	titleLabel.Font = Enum.Font.GothamBold;
	titleLabel.TextXAlignment = Enum.TextXAlignment.Left;
	titleLabel.Parent = header;

	const creditsLabel = new Instance("TextLabel");
	creditsLabel.Size = new UDim2(1, -20, 0, 14);
	creditsLabel.Position = new UDim2(0, 12, 0, 26);
	creditsLabel.BackgroundTransparency = 1;
	creditsLabel.RichText = true;
	creditsLabel.Text = '<font color="#94A3B8">Remake by ItsQuentar | Original by BoshyXd</font>';
	creditsLabel.TextColor3 = C.muted;
	creditsLabel.TextSize = 9;
	creditsLabel.Font = Enum.Font.GothamMedium;
	creditsLabel.TextXAlignment = Enum.TextXAlignment.Left;
	creditsLabel.Parent = header;

	const statusContainer = new Instance("Frame");
	statusContainer.Size = new UDim2(0, 24, 0, 24);
	statusContainer.Position = new UDim2(1, -36, 0, 12);
	statusContainer.BackgroundTransparency = 1;
	statusContainer.Parent = header;

	const statusIndicator = new Instance("Frame");
	statusIndicator.Size = new UDim2(0, 10, 0, 10);
	statusIndicator.Position = new UDim2(0.5, -5, 0.5, -5);
	statusIndicator.BackgroundColor3 = C.red;
	statusIndicator.BorderSizePixel = 0;
	statusIndicator.Parent = statusContainer;

	const statusCorner = new Instance("UICorner");
	statusCorner.CornerRadius = new UDim(1, 0);
	statusCorner.Parent = statusIndicator;

	const statusPulse = new Instance("Frame");
	statusPulse.Size = new UDim2(0, 12, 0, 12);
	statusPulse.Position = new UDim2(0, 0, 0, 0);
	statusPulse.BackgroundColor3 = C.red;
	statusPulse.BackgroundTransparency = 0.7;
	statusPulse.BorderSizePixel = 0;
	statusPulse.Parent = statusIndicator;

	const pulseCorner = new Instance("UICorner");
	pulseCorner.CornerRadius = new UDim(1, 0);
	pulseCorner.Parent = statusPulse;

	const statusText = new Instance("TextLabel");
	statusText.Size = new UDim2(0, 0, 0, 0);
	statusText.BackgroundTransparency = 1;
	statusText.Text = "OFFLINE";
	statusText.TextTransparency = 1;
	statusText.TextSize = 1;
	statusText.Font = Enum.Font.GothamMedium;
	statusText.TextColor3 = C.white;
	statusText.Parent = statusContainer;

	const tabBar = new Instance("Frame");
	tabBar.Size = new UDim2(1, 0, 0, 28);
	tabBar.Position = new UDim2(0, 0, 0, 48);
	tabBar.BackgroundColor3 = C.bg;
	tabBar.BackgroundTransparency = 0.8;
	tabBar.BorderSizePixel = 0;
	tabBar.Parent = mainFrame;

	const tabBarLayout = new Instance("UIListLayout");
	tabBarLayout.FillDirection = Enum.FillDirection.Horizontal;
	tabBarLayout.Padding = new UDim(0, 4);
	tabBarLayout.SortOrder = Enum.SortOrder.LayoutOrder;
	tabBarLayout.VerticalAlignment = Enum.VerticalAlignment.Center;
	tabBarLayout.Parent = tabBar;

	const tabBarPadding = new Instance("UIPadding");
	tabBarPadding.PaddingLeft = new UDim(0, 10);
	tabBarPadding.PaddingRight = new UDim(0, 10);
	tabBarPadding.Parent = tabBar;

	const addTabBtn = new Instance("TextButton");
	addTabBtn.Size = new UDim2(0, 22, 0, 22);
	addTabBtn.BackgroundColor3 = C.glass;
	addTabBtn.BackgroundTransparency = 0.5;
	addTabBtn.BorderSizePixel = 0;
	addTabBtn.Text = "+";
	addTabBtn.TextColor3 = C.white;
	addTabBtn.TextSize = 14;
	addTabBtn.Font = Enum.Font.GothamMedium;
	addTabBtn.LayoutOrder = 999;
	addTabBtn.Parent = tabBar;

	const addTabCorner = new Instance("UICorner");
	addTabCorner.CornerRadius = new UDim(0, 4);
	addTabCorner.Parent = addTabBtn;

	addTabBtn.MouseEnter.Connect(() => tweenProp(addTabBtn, { BackgroundTransparency: 0, BackgroundColor3: C.accent }));
	addTabBtn.MouseLeave.Connect(() => tweenProp(addTabBtn, { BackgroundTransparency: 0.5, BackgroundColor3: C.glass }));
	addTabBtn.Activated.Connect(() => {
		const newIndex = State.addConnection();
		if (newIndex !== undefined) {
			refreshTabBar();
			switchToTab(newIndex);
		}
	});

	const contentY = 82;
	const contentFrame = new Instance("ScrollingFrame");
	contentFrame.Size = new UDim2(1, -20, 1, -(contentY + 10));
	contentFrame.Position = new UDim2(0, 10, 0, contentY);
	contentFrame.BackgroundTransparency = 1;
	contentFrame.BorderSizePixel = 0;
	contentFrame.ScrollBarThickness = 3;
	contentFrame.ScrollBarImageColor3 = C.accent;
	contentFrame.CanvasSize = new UDim2(0, 0, 0, 0);
	contentFrame.AutomaticCanvasSize = Enum.AutomaticSize.Y;
	contentFrame.Parent = mainFrame;

	const card = new Instance("Frame");
	card.Size = new UDim2(1, 0, 0, 0);
	card.AutomaticSize = Enum.AutomaticSize.Y;
	card.BackgroundColor3 = C.glass;
	card.BackgroundTransparency = 0.4;
	card.BorderSizePixel = 0;
	card.LayoutOrder = 1;
	card.Parent = contentFrame;

	const cardCorner = new Instance("UICorner");
	cardCorner.CornerRadius = CORNER;
	cardCorner.Parent = card;

	const cardStroke = new Instance("UIStroke");
	cardStroke.Color = C.border;
	cardStroke.Thickness = 1.5;
	cardStroke.Transparency = 0.6;
	cardStroke.Parent = card;

	const cardPadding = new Instance("UIPadding");
	cardPadding.PaddingLeft = new UDim(0, 12);
	cardPadding.PaddingRight = new UDim(0, 12);
	cardPadding.PaddingTop = new UDim(0, 12);
	cardPadding.PaddingBottom = new UDim(0, 12);
	cardPadding.Parent = card;

	const cardLayout = new Instance("UIListLayout");
	cardLayout.Padding = new UDim(0, 8);
	cardLayout.SortOrder = Enum.SortOrder.LayoutOrder;
	cardLayout.Parent = card;

	const urlInput = new Instance("TextBox");
	urlInput.Size = new UDim2(1, 0, 0, 30);
	urlInput.BackgroundColor3 = C.bg;
	urlInput.BackgroundTransparency = 0.5;
	urlInput.BorderSizePixel = 0;
	urlInput.Text = "http://localhost:58741";
	urlInput.TextColor3 = C.white;
	urlInput.TextSize = 12;
	urlInput.Font = Enum.Font.GothamMedium;
	urlInput.ClearTextOnFocus = false;
	urlInput.PlaceholderText = "Server URL...";
	urlInput.PlaceholderColor3 = C.muted;
	urlInput.LayoutOrder = 1;
	urlInput.Parent = card;

	const urlCorner = new Instance("UICorner");
	urlCorner.CornerRadius = CORNER;
	urlCorner.Parent = urlInput;

	const urlStroke = new Instance("UIStroke");
	urlStroke.Color = C.border;
	urlStroke.Thickness = 1;
	urlStroke.Transparency = 0.8;
	urlStroke.Parent = urlInput;

	const urlPadding = new Instance("UIPadding");
	urlPadding.PaddingLeft = new UDim(0, 10);
	urlPadding.PaddingRight = new UDim(0, 10);
	urlPadding.Parent = urlInput;

	const statusRow = new Instance("Frame");
	statusRow.Size = new UDim2(1, 0, 0, 16);
	statusRow.BackgroundTransparency = 1;
	statusRow.LayoutOrder = 2;
	statusRow.Parent = card;

	const statusLabel = new Instance("TextLabel");
	statusLabel.Size = new UDim2(1, 0, 1, 0);
	statusLabel.BackgroundTransparency = 1;
	statusLabel.Text = "Disconnected";
	statusLabel.TextColor3 = C.red;
	statusLabel.TextSize = 11;
	statusLabel.Font = Enum.Font.GothamBold;
	statusLabel.TextXAlignment = Enum.TextXAlignment.Left;
	statusLabel.TextWrapped = true;
	statusLabel.Parent = statusRow;

	const detailStatusLabel = new Instance("TextLabel");
	detailStatusLabel.Size = new UDim2(0.5, 0, 1, 0);
	detailStatusLabel.Position = new UDim2(0.5, 0, 0, 0);
	detailStatusLabel.BackgroundTransparency = 1;
	detailStatusLabel.Text = "HTTP: X  MCP: X";
	detailStatusLabel.TextColor3 = C.muted;
	detailStatusLabel.TextSize = 10;
	detailStatusLabel.Font = Enum.Font.GothamMedium;
	detailStatusLabel.TextXAlignment = Enum.TextXAlignment.Right;
	detailStatusLabel.TextWrapped = true;
	detailStatusLabel.Parent = statusRow;

	const stepsFrame = new Instance("Frame");
	stepsFrame.Size = new UDim2(1, 0, 0, 0);
	stepsFrame.AutomaticSize = Enum.AutomaticSize.Y;
	stepsFrame.BackgroundTransparency = 1;
	stepsFrame.LayoutOrder = 3;
	stepsFrame.Parent = card;

	const stepsLayout = new Instance("UIListLayout");
	stepsLayout.Padding = new UDim(0, 3);
	stepsLayout.FillDirection = Enum.FillDirection.Vertical;
	stepsLayout.SortOrder = Enum.SortOrder.LayoutOrder;
	stepsLayout.Parent = stepsFrame;

	function createStepRow(text: string, order: number): [Frame, Frame, TextLabel] {
		const row = new Instance("Frame");
		row.Size = new UDim2(1, 0, 0, 16);
		row.BackgroundTransparency = 1;
		row.LayoutOrder = order;

		const d = new Instance("Frame");
		d.Size = new UDim2(0, 6, 0, 6);
		d.Position = new UDim2(0, 2, 0, 5);
		d.BackgroundColor3 = C.gray;
		d.BorderSizePixel = 0;
		d.Parent = row;

		const dCorner = new Instance("UICorner");
		dCorner.CornerRadius = new UDim(1, 0);
		dCorner.Parent = d;

		const lbl = new Instance("TextLabel");
		lbl.Size = new UDim2(1, -16, 1, 0);
		lbl.Position = new UDim2(0, 16, 0, 0);
		lbl.BackgroundTransparency = 1;
		lbl.Text = text;
		lbl.TextColor3 = C.dim;
		lbl.TextSize = 10;
		lbl.Font = Enum.Font.GothamMedium;
		lbl.TextXAlignment = Enum.TextXAlignment.Left;
		lbl.Parent = row;

		row.Parent = stepsFrame;
		return [row, d, lbl];
	}

	const [, step1Dot, step1Label] = createStepRow("HTTP server", 1);
	const [, step2Dot, step2Label] = createStepRow("MCP bridge", 2);
	const [, step3Dot, step3Label] = createStepRow("Commands", 3);

	const troubleshootLabel = new Instance("TextLabel");
	troubleshootLabel.Size = new UDim2(1, 0, 0, 26);
	troubleshootLabel.BackgroundTransparency = 1;
	troubleshootLabel.TextWrapped = true;
	troubleshootLabel.Visible = false;
	troubleshootLabel.Text = "MCP not responding. Close node.exe and restart server.";
	troubleshootLabel.TextColor3 = C.yellow;
	troubleshootLabel.TextSize = 10;
	troubleshootLabel.Font = Enum.Font.GothamMedium;
	troubleshootLabel.TextXAlignment = Enum.TextXAlignment.Left;
	troubleshootLabel.LayoutOrder = 4;
	troubleshootLabel.Parent = card;

	const connectButton = new Instance("TextButton");
	connectButton.Size = new UDim2(1, 0, 0, 34);
	connectButton.BackgroundColor3 = C.accent;
	connectButton.BackgroundTransparency = 0;
	connectButton.BorderSizePixel = 0;
	connectButton.Text = "Connect";
	connectButton.TextColor3 = C.white;
	connectButton.TextSize = 14;
	connectButton.Font = Enum.Font.GothamBold;
	connectButton.LayoutOrder = 5;
	connectButton.Parent = card;

	const connectCorner = new Instance("UICorner");
	connectCorner.CornerRadius = CORNER;
	connectCorner.Parent = connectButton;

	const connectStroke = new Instance("UIStroke");
	connectStroke.Color = C.subtle;
	connectStroke.Thickness = 2;
	connectStroke.Parent = connectButton;

	connectButton.MouseEnter.Connect(() => {
		buttonHover = true;
		const conn = State.getActiveConnection();
		if (conn && conn.isActive) {
			tweenProp(connectButton, { BackgroundColor3: C.surface, BackgroundTransparency: 0.2 });
			tweenProp(connectStroke, { Color: Color3.fromRGB(200, 80, 80) });
		} else {
			tweenProp(connectButton, { BackgroundColor3: C.accentLight });
			tweenProp(connectStroke, { Color: C.white });
		}
	});

	connectButton.MouseLeave.Connect(() => {
		buttonHover = false;
		const conn = State.getActiveConnection();
		if (conn && conn.isActive) {
			setButtonDisconnect(connectButton, connectStroke);
		} else {
			setButtonConnect(connectButton, connectStroke);
		}
	});


	elements = {
		screenGui, mainFrame, contentFrame, statusLabel, detailStatusLabel,
		statusIndicator, statusPulse, statusText, connectButton, connectStroke,
		urlInput, step1Dot, step1Label, step2Dot, step2Label, step3Dot, step3Label,
		troubleshootLabel, tabBar,
	};

	refreshTabBar();
}

function updateUIState() {
	const conn = State.getActiveConnection();
	if (!conn) return;
	const el = elements;

	if (conn.isActive) {
		el.statusLabel.Text = "Connecting...";
		el.statusLabel.TextColor3 = C.yellow;
		el.statusIndicator.BackgroundColor3 = C.yellow;
		el.statusPulse.BackgroundColor3 = C.yellow;
		el.statusText.Text = "CONNECTING";
		el.detailStatusLabel.Text = conn.consecutiveFailures === 0 ? "..." : "HTTP: X  MCP: X";
		el.detailStatusLabel.TextColor3 = C.muted;
		startPulseAnimation();

		el.step1Dot.BackgroundColor3 = C.yellow;
		el.step1Label.Text = "HTTP server (connecting...)";
		el.step2Dot.BackgroundColor3 = C.yellow;
		el.step2Label.Text = "MCP bridge (connecting...)";
		el.step3Dot.BackgroundColor3 = C.yellow;
		el.step3Label.Text = "Commands (connecting...)";
		conn.mcpWaitStartTime = undefined;
		el.troubleshootLabel.Visible = false;

		if (!buttonHover) setButtonDisconnect(el.connectButton, el.connectStroke);
		el.urlInput.TextEditable = false;
		el.urlInput.BackgroundColor3 = C.card;
	} else {
		el.statusLabel.Text = "Disconnected";
		el.statusLabel.TextColor3 = C.muted;
		el.statusIndicator.BackgroundColor3 = C.red;
		el.statusPulse.BackgroundColor3 = C.red;
		el.statusText.Text = "OFFLINE";
		el.detailStatusLabel.Text = "";
		el.detailStatusLabel.TextColor3 = C.muted;
		stopPulseAnimation();

		el.step1Dot.BackgroundColor3 = C.gray;
		el.step1Label.Text = "HTTP server";
		el.step2Dot.BackgroundColor3 = C.gray;
		el.step2Label.Text = "MCP bridge";
		el.step3Dot.BackgroundColor3 = C.gray;
		el.step3Label.Text = "Commands";
		conn.mcpWaitStartTime = undefined;
		el.troubleshootLabel.Visible = false;

		if (!buttonHover) setButtonConnect(el.connectButton, el.connectStroke);
		el.urlInput.TextEditable = true;
		el.urlInput.BackgroundColor3 = C.bg;
	}
}

export = {
	elements: undefined as unknown as UIElements,
	init,
	updateUIState,
	updateTabDot,
	stopPulseAnimation,
	startPulseAnimation,
	getElements: () => elements,
};
