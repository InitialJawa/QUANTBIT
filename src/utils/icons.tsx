import { Icon } from "@iconify/react";
import type { SVGProps, ForwardRefExoticComponent, RefAttributes } from "react";
import { forwardRef } from "react";

type IconProps = Omit<SVGProps<SVGSVGElement>, "ref"> & {
  size?: number | string;
  absoluteStrokeWidth?: boolean;
};

type IconType = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

function L(solarName: string): IconType {
  return forwardRef<SVGSVGElement, IconProps>(({ size = 24, color, className, ...props }, ref) => (
    <Icon
      ref={ref}
      icon={`solar:${solarName}`}
      width={size}
      height={size}
      color={color}
      className={className}
      {...props}
    />
  ));
}

export const Activity = L("chart-outline");
export const AlertCircle = L("danger-circle-outline");
export const AlertTriangle = L("danger-triangle-outline");
export const ArrowDownRight = L("arrow-down-right-outline");
export const ArrowRight = L("arrow-right-outline");
export const ArrowRightLeft = L("arrow-right-left-outline");
export const ArrowUp = L("arrow-up-outline");
export const ArrowUpRight = L("arrow-up-right-outline");
export const Award = L("cup-star-outline");
export const BadgeAlert = L("bell-bing-outline");
export const BarChart2 = L("chart-2-outline");
export const BarChart3 = L("chart-square-outline");
export const Beaker = L("flask-outline");
export const Bell = L("bell-outline");
export const BellOff = L("bell-off-outline");
export const BellRing = L("bell-bing-outline");
export const Bookmark = L("bookmark-outline");
export const BookmarkCheck = L("bookmark-check-outline");
export const BookOpen = L("book-bookmark-outline");
export const Bot = L("magic-stick-outline");
export const Briefcase = L("case-outline");
export const Bug = L("bug-outline");
export const Calculator = L("calculator-outline");
export const Calendar = L("calendar-outline");
export const ChartBar = L("chart-square-outline");
export const Check = L("check-outline");
export const CheckCircle = L("check-circle-outline");
export const CheckCircle2 = L("check-circle-outline");
export const ChevronDown = L("chevron-down-outline");
export const ChevronLeft = L("chevron-left-outline");
export const ChevronRight = L("chevron-right-outline");
export const ChevronUp = L("chevron-up-outline");
export const Clock = L("clock-circle-outline");
export const Coins = L("dollar-outline");
export const Copy = L("copy-outline");
export const CreditCard = L("card-outline");
export const Database = L("database-outline");
export const Download = L("download-outline");
export const Dribbble = L("dribbble-outline");
export const ExternalLink = L("external-link-outline");
export const Eye = L("eye-outline");
export const FileSpreadsheet = L("document-text-outline");
export const Filter = L("filter-outline");
export const HelpCircle = L("question-circle-outline");
export const History = L("clock-circle-outline");
export const Info = L("info-circle-outline");
export const Layers = L("layers-outline");
export const LayoutGrid = L("widget-outline");
export const LineChart = L("chart-linear-outline");
export const Link2 = L("link-outline");
export const Loader2 = L("spinner-outline");
export const Lock = L("lock-password-outline");
export const LogOut = L("logout-outline");
export const Mail = L("letter-outline");
export const Menu = L("hamburger-menu-outline");
export const Minus = L("minus-outline");
export const Moon = L("moon-outline");
export const Newspaper = L("articles-outline");
export const PanelLeftClose = L("sidebar-left-outline");
export const PanelLeftOpen = L("sidebar-right-outline");
export const Percent = L("percentage-outline");
export const Play = L("play-outline");
export const Plus = L("add-circle-outline");
export const RefreshCw = L("refresh-outline");
export const Save = L("diskette-outline");
export const Search = L("magnifer-outline");
export const Send = L("send-outline");
export const Settings = L("settings-outline");
export const Settings2 = L("tuning-2-outline");
export const ShieldAlert = L("shield-warning-outline");
export const ShoppingBag = L("bag-outline");
export const Sliders = L("tuning-outline");
export const SlidersHorizontal = L("tuning-horizontal-outline");
export const Sparkles = L("magic-stick-outline");
export const Sun = L("sun-outline");
export const Table = L("widget-outline");
export const Trash = L("trash-bin-trash-outline");
export const Trash2 = L("trash-bin-trash-outline");
export const TrendingDown = L("graph-down-outline");
export const TrendingUp = L("graph-up-outline");
export const User = L("user-outline");
export const Wallet = L("wallet-outline");
export const Wrench = L("wrench-outline");
export const X = L("close-circle-outline");
export const Zap = L("bolt-outline");
